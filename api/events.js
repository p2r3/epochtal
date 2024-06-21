const api_users = require("./users.js");

const events = require("../util/events.js");

module.exports = async function (args, request) {

  const [command, name] = args;

  switch (command) {

    case "subscribe": {
    
      const event = await events(["get", name]);

      if (event.auth && !(await event.auth(request))) return "ERR_PERMS";

      return new Response(
        new ReadableStream({
          start: function (controller) {

            const index = event.controllers.length;
            event.controllers.push(controller);

            request.onabort = function () {
              event.controllers.splice(index, 1);
              controller.close();
            };

          }
        }),
        {
          status: 200,
          headers: {
            "Content-Type": "text/event-stream",
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
          }
        }
      );

    }

  }

  return "ERR_COMMAND";

};
