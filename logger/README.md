# 📝 logger

## logger/logger.js

Winston-based logger shared across the entire framework.

| Property | Value |
|----------|-------|
| Level | `debug` |
| Format | `[YYYY-MM-DDTHH:mm:ss] message` |
| Transports | Console + rotating file (`<datetime>.log`) |
| Silent mode | Set `silent: true` to suppress all output |

Exported as a singleton — import and use anywhere:

```js
import logger from 'lh-pptr-framework/logger/logger.js';
logger.debug('Hello');
```