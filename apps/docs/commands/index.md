# Commands

The controller accepts 237 commands, plus a few more it replies to separately.
Every command has a page. Many commands are unverified, and some are unusable.

Parameters bind by position. The controller reads `<Parameter>` elements in
order and never looks at their names, so it silently drops a command whose
parameters are mis-ordered or missing. The SDK knows the correct order for each
command, and every page's parameter table shows it.

See [Status](/commands/status) for the verification and compatibility tables.
