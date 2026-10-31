# 📝 logger

## logger/logger.ts

Winston-based logger shared across the entire framework.

| Property | Value |
|----------|-------|
| Level | `debug` |
| Format | `[YYYY-MM-DDTHH:mm:ss] message` |
| Transports | Console + file (`<datetime>.log` in the working directory) |
| Silent mode | Set `silent: true` to suppress all output |

Exported as a singleton (`winston.Logger`) — import and use anywhere:

```js
import logger from 'lh-pptr-framework/logger/logger.js';
logger.debug('Hello');
```
