#!/usr/bin/env python3
"""
ClientFlow MCP Server
---------------------
Exposes tools for Hermes Agent to query projects and tasks from ClientFlow.

Usage (stdio - for Hermes config):
  python3 clientflow-mcp-server.py

Required env vars:
  SUPABASE_URL         = NEXT_PUBLIC_SUPABASE_URL from .env.local
  SUPABASE_SERVICE_KEY = SUPABASE_SERVICE_ROLE_KEY from .env.local
  (or shorter aliases: SUPABASE_URL, SUPABASE_SERVICE_KEY)

Example Hermes config.yaml:
  mcp_servers:
    clientflow:
      command: /usr/bin/python3
      args: ["/path/to/clientflow-mcp-server.py"]
      env:
        SUPABASE_URL: "https://xxx.supabase.co"
        SUPABASE_SERVICE_KEY: "eyJ..."
"""

import os, sys, json
from datetime import datetime, date, timedelta
from mcp.server.fastmcp import FastMCP
import httpx

# ── Supabase REST helpers ─────────────────────────────────────────

BASE_URL = ""
SERVICE_KEY = ""
HTTP: httpx.Client | None = None


def _init():
    global BASE_URL, SERVICE_KEY, HTTP
    BASE_URL = os.environ.get("SUPABASE_URL") or os.environ.get("NEXT_PUBLIC_SUPABASE_URL", "")
    SERVICE_KEY = os.environ.get("SUPABASE_SERVICE_KEY") or os.environ.get("SUPABASE_SERVICE_ROLE_KEY", "")
    if not BASE_URL or not SERVICE_KEY:
        print("ERROR: SUPABASE_URL and SUPABASE_SERVICE_KEY required", file=sys.stderr)
        sys.exit(1)
    HTTP = httpx.Client(timeout=20)


def _get(table: str, params: dict | None = None) -> list:
    url = f"{BASE_URL}/rest/v1/{table}"
    headers = {
        "apikey": SERVICE_KEY,
        "Authorization": f"Bearer {SERVICE_KEY}",
        "Content-Type": "application/json",
    }
    r = HTTP.get(url, headers=headers, params=params or {})
    r.raise_for_status()
    return r.json()


def _get_one(table: str, params: dict | None = None) -> dict | None:
    p = {**(params or {}), "limit": "1"}
    data = _get(table, p)
    return data[0] if data else None


def _user(email: str) -> dict | None:
    """Look up profile by email."""
    return _get_one("profiles", {"email": f"eq.{email}"})


def _company_projects(cid: str) -> list:
    return _get("projects", {
        "company_id": f"eq.{cid}",
        "deleted_at": "is.null",
        "order": "name.asc",
    })


def _user_projects(profile_id: str) -> list:
    prof = _get_one("profiles", {"id": f"eq.{profile_id}"})
    if not prof:
        return []
    cid = prof.get("company_id")
    if not cid:
        return []
    role = prof.get("role", "")
    if role in ("admin", "manager"):
        return _company_projects(cid)
    # Member: projects via project_members
    memberships = _get("project_members", {
        "profile_id": f"eq.{profile_id}",
        "select": "project_id",
    })
    pids = [m["project_id"] for m in memberships]
    if not pids:
        return []
    # Build in filter for project IDs
    result = []
    for pid in pids:
        proj = _get_one("projects", {
            "id": f"eq.{pid}",
            "deleted_at": "is.null",
        })
        if proj:
            result.append(proj)
    return sorted(result, key=lambda x: x.get("name", ""))


def _tasks_for_project(pid: str, status: str = None) -> list:
    params = {
        "project_id": f"eq.{pid}",
        "deleted_at": "is.null",
        "order": "created_at.desc",
    }
    if status:
        params["status"] = f"eq.{status}"
    return _get("tasks", params)


def _tasks_for_user(uid: str, status: str = None) -> list:
    params = {
        "assigned_to": f"eq.{uid}",
        "deleted_at": "is.null",
        "order": "due_date.asc.nullsfirst",
    }
    if status:
        params["status"] = f"eq.{status}"
    return _get("tasks", params)


def _serialize(row: dict) -> dict:
    """Convert DB row to JSON-safe dict."""
    result = {}
    for k, v in row.items():
        if isinstance(v, (datetime, date)):
            result[k] = v.isoformat()
        else:
            result[k] = v
    return result


def _enrich_project(p: dict) -> dict:
    item = _serialize(p)
    if p.get("client_id"):
        c = _get_one("clients", {"id": f"eq.{p['client_id']}"})
        if c:
            item["client_name"] = c.get("company_name", "")
    return item


def _enrich_task(t: dict) -> dict:
    item = _serialize(t)
    if t.get("project_id"):
        p = _get_one("projects", {"id": f"eq.{t['project_id']}"})
        if p:
            item["project_name"] = p.get("name", "")
    if t.get("assigned_to"):
        u = _get_one("profiles", {"id": f"eq.{t['assigned_to']}"})
        if u:
            item["assigned_name"] = u.get("full_name") or u.get("email", "")
    return item


# ── MCP Server ─────────────────────────────────────────────────────

mcp = FastMCP(
    "ClientFlow",
    instructions="Query projects and tasks from ClientFlow CRM. "
    "Use 'email' to scope to a specific user. "
    "Tools: list projects, get project detail, list tasks, get task, my tasks, upcoming tasks.",
)


# ── Tools ──────────────────────────────────────────────────────────

@mcp.tool(title="List Projects", description="List all projects visible to a user or company.")
def clientflow_list_projects(
    email: str = "",
    status: str = "",
    company_id: str = "",
) -> str:
    """
    List projects.

    Args:
        email: User email to scope results (optional)
        status: Filter: planning, active, on_hold, completed, cancelled (optional)
        company_id: Direct company UUID (optional, alternative to email)

    Returns: JSON array of projects
    """
    _init()
    try:
        projects = []
        if email:
            u = _user(email)
            if not u:
                return json.dumps({"error": f"User '{email}' not found"}, indent=2)
            projects = _user_projects(u["id"])
        elif company_id:
            projects = _company_projects(company_id)
        else:
            # Auto-detect first company
            comps = _get("companies", {"limit": "1"})
            if comps:
                projects = _company_projects(comps[0]["id"])

        if status:
            projects = [p for p in projects if p.get("status") == status]

        result = [_enrich_project(p) for p in projects]
        return json.dumps(result, indent=2, default=str)
    except Exception as e:
        return json.dumps({"error": str(e)}, indent=2)


@mcp.tool(title="Get Project", description="Full details of a project: members, client info.")
def clientflow_get_project(project_id: str) -> str:
    """
    Get a specific project by ID.

    Args:
        project_id: UUID of the project

    Returns: JSON with project details + client + members
    """
    _init()
    try:
        p = _get_one("projects", {"id": f"eq.{project_id}"})
        if not p:
            return json.dumps({"error": "Project not found"}, indent=2)

        project = _serialize(p)

        # Client
        if p.get("client_id"):
            c = _get_one("clients", {"id": f"eq.{p['client_id']}"})
            if c:
                project["client"] = {k: c[k] for k in ("company_name", "contact_name", "email", "phone") if k in c}

        # Members
        members = _get("project_members", {
            "project_id": f"eq.{project_id}",
            "select": "profile_id,role_in_project",
        })
        for m in members:
            u = _get_one("profiles", {"id": f"eq.{m['profile_id']}"})
            if u:
                m["name"] = u.get("full_name", "")
                m["email"] = u.get("email", "")
        project["members"] = members

        return json.dumps(project, indent=2, default=str)
    except Exception as e:
        return json.dumps({"error": str(e)}, indent=2)


@mcp.tool(title="List Tasks", description="Tasks for a project or user with optional filters.")
def clientflow_list_tasks(
    project_id: str = "",
    assigned_to_email: str = "",
    status: str = "",
) -> str:
    """
    List tasks.

    Args:
        project_id: Project UUID to filter by
        assigned_to_email: User email to filter by
        status: pending, in_progress, in_review, completed, cancelled

    Returns: JSON array of tasks
    """
    _init()
    try:
        tasks = []
        if project_id:
            tasks = _tasks_for_project(project_id, status or None)
        elif assigned_to_email:
            u = _user(assigned_to_email)
            if not u:
                return json.dumps({"error": f"User '{assigned_to_email}' not found"}, indent=2)
            tasks = _tasks_for_user(u["id"], status or None)
        else:
            return json.dumps({"error": "Provide project_id or assigned_to_email"}, indent=2)

        result = [_enrich_task(t) for t in tasks]
        return json.dumps(result, indent=2, default=str)
    except Exception as e:
        return json.dumps({"error": str(e)}, indent=2)


@mcp.tool(title="Get Task", description="Full task details with comments and attachments.")
def clientflow_get_task(task_id: str) -> str:
    """
    Get a specific task by ID.

    Args:
        task_id: UUID of the task

    Returns: JSON with task + project + assignee + comments
    """
    _init()
    try:
        t = _get_one("tasks", {"id": f"eq.{task_id}"})
        if not t:
            return json.dumps({"error": "Task not found"}, indent=2)

        task = _serialize(t)

        # Project
        if t.get("project_id"):
            p = _get_one("projects", {"id": f"eq.{t['project_id']}"})
            if p:
                task["project"] = {"name": p.get("name", ""), "status": p.get("status", ""), "color": p.get("color", "")}

        # Assignee
        if t.get("assigned_to"):
            u = _get_one("profiles", {"id": f"eq.{t['assigned_to']}"})
            if u:
                task["assigned_to_user"] = {"name": u.get("full_name", ""), "email": u.get("email", "")}

        # Comments
        comments = _get("task_comments", {
            "task_id": f"eq.{task_id}",
            "order": "created_at.asc",
        })
        for c in comments:
            author = _get_one("profiles", {"id": f"eq.{c['author_id']}"})
            if author:
                c["author_name"] = author.get("full_name", "")
            c = _serialize(c)
        task["comments"] = comments

        return json.dumps(task, indent=2, default=str)
    except Exception as e:
        return json.dumps({"error": str(e)}, indent=2)


@mcp.tool(title="My Tasks", description="Active tasks assigned to a user grouped by status.")
def clientflow_my_tasks(email: str) -> str:
    """
    Get all active tasks for a user.

    Args:
        email: User email

    Returns: JSON grouped by pending, in_progress, in_review
    """
    _init()
    try:
        u = _user(email)
        if not u:
            return json.dumps({"error": f"User '{email}' not found"}, indent=2)

        uid = u["id"]
        pending = [_enrich_task(t) for t in _tasks_for_user(uid, "pending")]
        in_progress = [_enrich_task(t) for t in _tasks_for_user(uid, "in_progress")]
        in_review = [_enrich_task(t) for t in _tasks_for_user(uid, "in_review")]

        return json.dumps({
            "user": {"email": u.get("email", ""), "name": u.get("full_name", "")},
            "pending": pending,
            "in_progress": in_progress,
            "in_review": in_review,
            "total_active": len(pending) + len(in_progress) + len(in_review),
        }, indent=2, default=str)
    except Exception as e:
        return json.dumps({"error": str(e)}, indent=2)


@mcp.tool(title="Upcoming Tasks", description="Tasks due soon for a user, including overdue ones.")
def clientflow_upcoming_tasks(email: str) -> str:
    """
    Get upcoming tasks due for a user (overdue + future).

    Args:
        email: User email

    Returns: JSON array sorted by due date with is_overdue flag
    """
    _init()
    try:
        u = _user(email)
        if not u:
            return json.dumps({"error": f"User '{email}' not found"}, indent=2)

        uid = u["id"]
        today = date.today().isoformat()

        # Overdue
        overdue = _get("tasks", {
            "assigned_to": f"eq.{uid}",
            "deleted_at": "is.null",
            "status": "neq.completed",
            "due_date": f"lt.{today}",
            "order": "due_date.asc",
        })

        # Future
        future = _get("tasks", {
            "assigned_to": f"eq.{uid}",
            "deleted_at": "is.null",
            "status": "neq.completed",
            "due_date": f"gte.{today}",
            "order": "due_date.asc",
        })

        result = []
        for t in overdue:
            item = _enrich_task(t)
            item["is_overdue"] = True
            result.append(item)
        for t in future:
            item = _enrich_task(t)
            item["is_overdue"] = False
            result.append(item)

        return json.dumps(result, indent=2, default=str)
    except Exception as e:
        return json.dumps({"error": str(e)}, indent=2)


# ── Run ────────────────────────────────────────────────────────────

if __name__ == "__main__":
    mcp.run(transport="stdio")
