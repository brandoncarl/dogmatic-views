
2015-03-16 v0.0.3
--------------------------------------------------------
* New: Views#templateHandler provides two-pass rendering
* Fixed: Views#*Handler: Express 3.x compatible 404s
* New: skeletons configuration of first and second pass rendering engine (not functional)
* Improved: Views#file: zipping and caching now optional
* Improved: functions now use options rather than arguments
* Improved: introduction better documented
* Improved: #send* functions now "handlers"


2015-03-16 v0.0.2
--------------------------------------------------------
* Improved: Views#sendStatic includes cache warming
* Fixed: Views#sendScript had bad variables
* Improved: Views#sendStatic Express 3.x compatible
* Improved: better debugging output
* Fixed: relative path names in Views#jade
* Fixed: path detection RegExp requires start of filename


2015-03-16 v0.0.1
--------------------------------------------------------
* Created route handlers
* Created file functions
* Created helper functions
* Created Readme