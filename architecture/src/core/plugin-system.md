# plugin-system.js

**Path:** `src\core\plugin-system.js`

## Dependencies
- `fs/promises` → fs (L1)
- `path` → path (L2)
- `url` → fileURLToPath (L3)
- `chokidar` → chokidar (L4)
- `url` → pathToFileURL (L5)

## Exports
- **registerCoreHandler** [function] (L18)
- **Plugin** [class] (L23)
- **initPluginSystem** [function] (L83)
- **getPluginDependencies** [function] (L135)
- **loadAllPlugins** [function] (L162)
- **loadPlugin** [function] (L190)
- **unloadPlugin** [function] (L256)
- **reloadPlugin** [function] (L274)
- **getLoadedPlugins** [function] (L286)
- **getPlugin** [function] (L297)
- **enablePlugin** [function] (L303)
- **disablePlugin** [function] (L316)
- **stopPluginWatcher** [function] (L398)
- **executePluginCommand** [function] (L406)
- **emitToPlugins** [function] (L420)
- **ExamplePlugin** [class] (default) (L444)
- **getPluginStats** [function] (L493)
- **getPluginCommands** [function] (L565)
- **getPluginCommandHandler** [function] (L595)
- **handlePluginCommand** [function] (L600)
- **handlePluginAutocomplete** [function] (L615)
- **getPluginCommandByGroup** [function] (L630)
- **getPluginByParentCommand** [function] (L651)
- **getPluginsByParentCommand** [function] (L661)
- **getAllSchemaExtensions** [function] (L685)
- **applyPluginSchemaExtensions** [function] (L701)

## Classes
### ExamplePlugin extends Plugin (L444)

**Methods:**
- `constructor()` (L445)
- `async onLoad()` (L449)
- `async onUnload()` (L453)
- `async onEnable()` (L457)
- `async onDisable()` (L461)
- `async greet(name)` (L466)
- `async onNetworkScan(devices)` (L471)
- `async onSpeedTest(results)` (L476)

## Functions
- ✓ `registerCoreHandler(event, handler)` (L18)
- ✓ `getPluginStats()` (L493)
- `async loadPluginCommands(pluginName)` (L504)
- ✓ `getPluginCommands()` (L565)
- ✓ `getPluginCommandHandler(pluginName)` (L595)
- ✓ `async handlePluginCommand(pluginName, interaction)` (L600)
- ✓ `async handlePluginAutocomplete(pluginName, interaction)` (L615)
- ✓ `getPluginCommandByGroup(parentCommand, subcommandGroup)` (L630)
- ✓ `getPluginByParentCommand(parentCommand)` (L651)
- ✓ `getPluginsByParentCommand(parentCommand)` (L661)
- ✓ `getAllSchemaExtensions()` (L685)
- ✓ `async applyPluginSchemaExtensions(db)` (L701)

## Constants
- **loadedPlugins** [value] (L11)
- **pluginCommands** [value] (L12)

