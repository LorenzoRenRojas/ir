<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# Project context

Read `docs/HANDBOOK.md` before starting work — it is the complete project
handbook: architecture, data constraints (SAM.gov quota!), operations,
brand system, pending tasks, and how the founder works.

# Commit authorship — set this before your first commit

Lorenzo is the author of this project. Every commit must be authored as him,
with Claude credited as co-author in the trailer. Before committing, run:

```
git config user.name "Lorenzo Rojas"
git config user.email "lorenzo.rojas99x@gmail.com"
```

This is not cosmetic. GitHub builds the contribution graph from the author
email, so commits authored as `Claude <noreply@anthropic.com>` credit nobody
and leave the person who directed the work invisible in their own repository.
The first fifty commits were made this way and had to be rewritten to correct
it. Do not recreate the problem: author is the human, co-author is the tool.
