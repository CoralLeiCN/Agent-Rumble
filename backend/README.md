# Agent Project Intelligence Backend

This directory contains the FastAPI backend and its Python project metadata.
The backend exposes the API used to generate and retrieve Agent Project Cards;
the separate React frontend will consume these interfaces.

From the repository root, synchronize the locked workspace environment:

```shell
uv sync --locked
```

Start the development server:

```shell
uv run --locked fastapi dev backend/src/agent_project_intelligence/main.py
```

Run the backend tests:

```shell
uv run --locked pytest backend/tests
```

Add endpoint groups under
`src/agent_project_intelligence/api/routes/` and include their routers from
`src/agent_project_intelligence/api/router.py`.
