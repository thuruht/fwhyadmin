# TODO_CLEANUP

# Project Cleanup & TODOs

## Immediate TODOs
- [ ] Finalize and unify admin dashboard navigation (remove duplicate/legacy nav, use one elegant system)
- [ ] Ensure admin dashboard and login page are fully styled to match 404/main site
- [ ] Replace all alert() and dev helpers with a notification system or remove from client
- [ ] Audit and document all error messages (make them terse, plain, whimsical)
- [ ] Review and update all documentation for accuracy and completeness
- [ ] Push to git after every fix, deploy after every major improvement

## Directory Cleanup
- [ ] Move all unused, legacy, or bloat files to a clearly named backup/legacy directory outside the main project
- [ ] Remove or archive any wrangler.toml files (use wrangler.jsonc only)
- [ ] Remove duplicate or unused CSS/JS/images/fonts
- [ ] Ensure only one source of truth for each config and asset

## Documentation
- [ ] Maintain OPERATIONAL_STATUS.md and CURRENT_STATUS.md with real, up-to-date info
- [ ] Add/expand code comments for all major modules and tricky logic
- [ ] Document any non-obvious design decisions in docs/

## Security
- [ ] Ensure no dev/test helpers are exposed to clients
- [ ] Add/verify rate limiting and suspicious request logging
- [ ] Review all public endpoints for proper CORS and auth

---

**When a task is completed, check it off and push to git. Deploy after every major improvement.**
