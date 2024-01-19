// The logger that is needed by the cloud functions
// it passes the logs to the parse server logger
export class Logger {
  noodlServer: any;

  constructor(noodlServer) {
    this.noodlServer = noodlServer;
  }

  log(level, message) {
    setImmediate(() => {
      this.noodlServer.logger._log(level, message);
    });
  }
}
