## Classes

<dl>
<dt><a href="#Command">Command</a></dt>
<dd><p>Command is abstract class that should be extended to make your own custom
command. It is also need to be exported as default when using
<code>registerCommands</code>.</p></dd>
<dt><a href="#CommandManager">CommandManager</a></dt>
<dd><p>CommandManager stores all your commands</p></dd>
</dl>

## Members

<dl>
<dt><a href="#verbose">verbose</a> : <code>boolean</code></dt>
<dd><p>Show command logging</p></dd>
<dt><a href="#prefix">prefix</a> : <code>string</code></dt>
<dd><p>Bot's prefix</p></dd>
</dl>

<a name="Command"></a>

## Command
<p>Command is abstract class that should be extended to make your own custom
command. It is also need to be exported as default when using
<code>registerCommands</code>.</p>

**Kind**: global class  
<a name="CommandManager"></a>

## CommandManager
<p>CommandManager stores all your commands</p>

**Kind**: global class  

* [CommandManager](#CommandManager)
    * [new CommandManager(prefix)](#new_CommandManager_new)
    * [.registerCommand(name, cmd)](#CommandManager+registerCommand)
    * [.registerCommandNotFoundHandler(fn)](#CommandManager+registerCommandNotFoundHandler)
    * [.registerCommandOnThrottleHandler(fn)](#CommandManager+registerCommandOnThrottleHandler)
    * [.registerCommands(dir)](#CommandManager+registerCommands)
    * [.handleMessage(msg)](#CommandManager+handleMessage)

<a name="new_CommandManager_new"></a>

### new CommandManager(prefix)

| Param | Type | Description |
| --- | --- | --- |
| prefix | <code>string</code> | <p>The bot's prefix</p> |

<a name="CommandManager+registerCommand"></a>

### commandManager.registerCommand(name, cmd)
<p>Register a singular command</p>

**Kind**: instance method of [<code>CommandManager</code>](#CommandManager)  

| Param | Type | Description |
| --- | --- | --- |
| name | <code>string</code> | <p>The name of the command</p> |
| cmd | [<code>Command</code>](#Command) | <p>The subclass of Command</p> |

<a name="CommandManager+registerCommandNotFoundHandler"></a>

### commandManager.registerCommandNotFoundHandler(fn)
<p>Register handler for command not found error. By default, the error will be
ignored.</p>

**Kind**: instance method of [<code>CommandManager</code>](#CommandManager)  

| Param | Type | Description |
| --- | --- | --- |
| fn | <code>function</code> | <p>Function to be executed when command not found error occurs</p> |

<a name="CommandManager+registerCommandOnThrottleHandler"></a>

### commandManager.registerCommandOnThrottleHandler(fn)
<p>Register handler for command is on throttle. By default, the command will
continue be blocked without any message.</p>

**Kind**: instance method of [<code>CommandManager</code>](#CommandManager)  

| Param | Type | Description |
| --- | --- | --- |
| fn | <code>function</code> | <p>Function to be executed when command is on throttle</p> |

<a name="CommandManager+registerCommands"></a>

### commandManager.registerCommands(dir)
<p>Register commands from the whole directory. All command files should
default export the Command class.</p>

**Kind**: instance method of [<code>CommandManager</code>](#CommandManager)  

| Param | Type | Description |
| --- | --- | --- |
| dir | <code>string</code> | <p>Directory where all the command files reside.</p> |

**Example**  
```js
const commandManager = new CommandManager("!");
commandManager.registerCommands(path.join(__dirname, "./commands"));
```
<a name="CommandManager+handleMessage"></a>

### commandManager.handleMessage(msg)
<p>This should be attached to the &quot;messageCreate&quot; event</p>

**Kind**: instance method of [<code>CommandManager</code>](#CommandManager)  

| Param | Type | Description |
| --- | --- | --- |
| msg | <code>Message</code> | <p>discord's Message object</p> |

<a name="verbose"></a>

## verbose : <code>boolean</code>
<p>Show command logging</p>

**Kind**: global variable  
<a name="prefix"></a>

## prefix : <code>string</code>
<p>Bot's prefix</p>

**Kind**: global variable  
