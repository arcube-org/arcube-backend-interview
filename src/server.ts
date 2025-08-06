import app from "./app";
import { env } from "./config/environment";

app.listen(env.PORT, (): void => {
  console.log(`🚀 Server running on http://${env.HOST}:${env.PORT}`);
  console.log(`📊 Environment: ${env.NODE_ENV}`);
});
