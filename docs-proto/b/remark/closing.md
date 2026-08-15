The sheet brings its own fonts, its own reset and its own design tokens, all
under one `.bcc-canvas` wrapper — it neither picks up your site's styles nor
pushes anything onto the page around it. When a fence cannot be drawn, the
placeholder lands in the page and the plugin puts a warning on the VFile;
escalating is your site's call, through its own fail-on-warn. `root` is the
other option the plugin takes: paths never resolve outside it, and it defaults
to the directory the build runs in.
