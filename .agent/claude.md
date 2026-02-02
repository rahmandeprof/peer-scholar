# Development Guidelines

## Bug Fixing Process

When a bug is reported:

1. **Write a test first** - Create a test that reproduces the bug
2. **Verify the test fails** - Confirm the test catches the bug
3. **Fix the bug** - Implement the fix
4. **Prove with passing test** - Run the test to verify the fix works

This ensures:
- The bug is properly understood before fixing
- The fix actually addresses the reported issue
- The bug won't regress in the future
