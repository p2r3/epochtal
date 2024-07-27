const UtilError = require("./error.js");
const tmppath = require("../util/tmppath.js");

const fs = require("fs");

const InitCanvasKit = require('canvaskit-wasm');
const CanvasKitFuture = InitCanvasKit();

// Load the font data
const fontData = fs.readFileSync(`${__dirname}/../pages/fonts/Quicksand.ttf`);
const emojisData = fs.readFileSync(`${__dirname}/../pages/fonts/fa-solid-900.ttf`);

/**
 * Handles the `discord` utility call. This utility is used to interact with the discord server.
 *
 * The following subcommands are available:
 * - `announce`: Send an announcement to the announcements channel
 * - `releasemap`: Send a map release announcement to the map announcements channel
 * - `report`: Send a report to the reports channel
 * - `update`: Send an update to the updates channel
 *
 * @author PancakeTAS
 * @param {string[]} args The arguments for the call
 * @param {unknown} context The context on which to execute the call (defaults to epochtal)
 * @returns {string} The output of the call
 */
module.exports = async function (args, context = epochtal) {

  const command = args[0];

  // Parse the content and files from the arguments
  const content = Array.isArray(args[2]) ? args[1] : args.slice(1).join(" ");
  const files = Array.isArray(args[2]) ? args[2] : [];

  // Send appropriate message to the discord server
  switch (command) {

    case "announce": {

      await discordClient.channels.cache.get(context.data.discord.announce).send({ content, files });
      return "SUCCESS";

    }

    case "releasemap": {

      // Download map thumbnail
      let thumbnail = context.data.week.map.thumbnail;
      if (!thumbnail.startsWith("http")) {
        thumbnail = `https://steamuserimages-a.akamaihd.net/ugc/${thumbnail}?impolicy=Letterbox&imh=360`;
      }

      const response = await fetch(thumbnail);
      const buffer = await response.arrayBuffer();

      // Render map release image
      const image = await render(
        buffer,
        context.data.week.map.title,
        context.data.week.map.author,
        context.data.week.map.upvotes,
        context.data.week.map.downvotes
      );

      const imagePath = (await tmppath()) + ".png";
      Bun.write(imagePath, image);

      // Send the image to the discord server
      try {
        files.push({ attachment: imagePath, name: "maprelease.png" });
        await discordClient.channels.cache.get(context.data.discord.announce).send({ content, files });
      } finally {
        fs.unlinkSync(imagePath);
      }

      return "SUCCESS";

    }

    case "report": {

      await discordClient.channels.cache.get(context.data.discord.report).send({ content, files });
      return "SUCCESS";

    }

    case "update": {

      await discordClient.channels.cache.get(context.data.discord.update).send({ content, files });
      return "SUCCESS";

    }

  }

  throw new UtilError("ERR_COMMAND", args, context);

};

/**
 * Draw a rounded box on the canvas
 *
 * @author PancakeTAS
 * @param {CanvasKit} CK CanvasKit
 * @param {Canvas} canvas CanvasKit canvas
 * @param {Paint} paint Paint object
 * @param {Number} x X
 * @param {Number} y Y
 * @param {Number} width Width
 * @param {Number} height Height
 * @param {Number} radius Radius of the corners
 * @param {Number} stroke Border stroke width
 * @param {Number} fill Box fill color
 * @param {Number} border Border color
 */
function drawRoundedBox(CK, canvas, paint, x, y, width, height, radius, stroke, fill, border) {

  // Fill the box
  paint.setStyle(CK.PaintStyle.Fill);
  paint.setColor(fill);

  canvas.drawRRect(CK.RRectXY(CK.XYWHRect(x, y, width, height), radius, radius), paint);

  // Draw the border
  paint.setStyle(CK.PaintStyle.Stroke);
  paint.setStrokeWidth(stroke);
  paint.setColor(border);

  canvas.drawRRect(CK.RRectXY(CK.XYWHRect(x, y, width, height), radius, radius), paint);

}

/**
 * Draw an image with rounded corners on the canvas
 *
 * @author PancakeTAS
 * @param {CanvasKit} CK CanvasKit
 * @param {Canvas} canvas CanvasKit canvas
 * @param {Paint} paint Paint object
 * @param {Image} image Image to draw
 * @param {Number} x X
 * @param {Number} y Y
 * @param {Number} width Width
 * @param {Number} height Height
 * @param {Number} radius Radius of the corners
 */
function drawRoundedImage(CK, canvas, paint, image, x, y, width, height, radius) {

  paint.setStyle(CK.PaintStyle.Fill);

  // Mask the image with a rounded rectangle
  const path = new CK.Path();
  path.addRRect(CK.RRectXY(CK.XYWHRect(x, y, width, height), radius, radius));

  canvas.save(); // push canvas state
  canvas.clipPath(path, CK.ClipOp.Intersect, true);

  // Draw the image
  canvas.drawImageRectOptions(
    image,
    CK.XYWHRect(0, 0, image.width(), image.height()),
    CK.XYWHRect(x, y, width, height),
    CK.FilterMode.Linear, CK.MipmapMode.Linear,
    paint
  );

  canvas.restore(); // pop canvas state

}

/**
 * Render the map release canvas into a buffer
 *
 * @author PancakeTAS
 * @param {Array} thumbnailData Byte array of the map thumbnail
 * @param {string} title Title of the map
 * @param {string} author Author of the map
 * @param {number} upvotes The number of upvotes
 * @param {number} downvotes The number of downvotes
 * @returns {string} Base64 encoded png image
 */
async function render(thumbnailData, title, author, upvotes, downvotes) {

  const CK = await CanvasKitFuture;

  // Create the canvas
  const CANVAS_WIDTH = 922 * 2;
  const CANVAS_HEIGHT = 150 * 2;
  const CANVAS_PADDING = 3840 * 0.5 / 100;

  const INNER_WIDTH = CANVAS_WIDTH - CANVAS_PADDING * 2;
  const INNER_HEIGHT = CANVAS_HEIGHT - CANVAS_PADDING * 2;

  const surface = CK.MakeSurface(CANVAS_WIDTH, CANVAS_HEIGHT);
  const canvas = surface.getCanvas();

  const thumbnail = CK.MakeImageFromEncoded(thumbnailData);

  const paint = new CK.Paint();
  paint.setAntiAlias(true);

  // Draw background
  const BG_BORDER_STROKE = 4;
  const BG_RADIUS = 20;
  const BG_BORDER_COLOR = CK.Color(0xFF, 0xFF, 0xFF, 0xFF);
  const BG_FILL_COLOR = CK.Color(0x04, 0x04, 0x04, 0xFF);
  const BG_X = BG_BORDER_STROKE;
  const BG_Y = BG_BORDER_STROKE;
  const BG_WIDTH = CANVAS_WIDTH - BG_BORDER_STROKE * 2;
  const BG_HEIGHT = CANVAS_HEIGHT - BG_BORDER_STROKE * 2;

  drawRoundedBox(
    CK, canvas, paint,
    BG_X, BG_Y, BG_WIDTH, BG_HEIGHT,
    BG_RADIUS,
    BG_BORDER_STROKE,
    BG_FILL_COLOR, BG_BORDER_COLOR
  );

  // Draw map thumbnail
  const TH_RADIUS = 20;
  const TH_WIDTH = INNER_WIDTH * 0.25;
  const TH_HEIGHT = TH_WIDTH / 16 * 9;
  const TH_X = CANVAS_PADDING;
  const TH_Y = CANVAS_PADDING + (INNER_HEIGHT - TH_HEIGHT) / 2;

  drawRoundedImage(
    CK, canvas, paint,
    thumbnail,
    TH_X, TH_Y, TH_WIDTH, TH_HEIGHT,
    TH_RADIUS
  );

  // Draw map info
  const IF_X = TH_X + TH_WIDTH + (INNER_WIDTH * 0.02);
  const IF_Y = CANVAS_PADDING + 18;
  const IF_FONTSIZE = 61;
  const IF_COLOR = CK.WHITE;
  const IF_UPVOTES_COLOR = CK.Color(23, 192, 233, 0xFF);
  const IF_DOWNVOTES_COLOR = CK.Color(232, 63, 22, 0xFF);
  const IF_TITLESTYLE = new CK.TextStyle({
    color: IF_COLOR,
    fontFamilies: ['Quicksand'],
    fontSize: IF_FONTSIZE,
    fontStyle: { weight: 400, width: CK.FontWidth.Bold, slant: CK.FontSlant.Normal }
  });
  const IF_AUTHORSTYLE = new CK.TextStyle({
    color: IF_COLOR,
    fontFamilies: ['Quicksand', 'Font Awesome 6 Free'],
    fontSize: IF_FONTSIZE,
    fontStyle: { weight: 300, width: CK.FontWidth.Normal, slant: CK.FontSlant.Italic }
  });
  const IF_VOTESSTYLE = new CK.TextStyle({
    fontFamilies: ['Quicksand', 'Font Awesome 6 Free'],
    fontSize: IF_FONTSIZE
  });
  const IF_STYLE = new CK.ParagraphStyle({
    textStyle: IF_TITLESTYLE,
    color: IF_COLOR,
    textAlign: CK.TextAlign.Left,
    maxLines: 2
  });
  const infoBuilder = new CK.ParagraphBuilder.Make(IF_STYLE, CK.FontMgr.FromData(fontData, emojisData));

  infoBuilder.addText(title + "\n");
  infoBuilder.pushStyle(IF_AUTHORSTYLE);
  infoBuilder.addText(author);
  infoBuilder.pop();
  infoBuilder.addText("  ");
  IF_VOTESSTYLE.color = IF_UPVOTES_COLOR;
  infoBuilder.pushStyle(IF_VOTESSTYLE);
  infoBuilder.addText(upvotes + " 👍")
  infoBuilder.pop();
  infoBuilder.addText("  ");
  IF_VOTESSTYLE.color = IF_DOWNVOTES_COLOR;
  infoBuilder.pushStyle(IF_VOTESSTYLE);
  infoBuilder.addText(downvotes + " 👎");
  infoBuilder.pop();

  const infoParagraph = infoBuilder.build();
  infoParagraph.layout(INNER_WIDTH * 0.7);
  canvas.drawParagraph(infoParagraph, IF_X, IF_Y);

  // Save the canvas to a buffer
  return surface.makeImageSnapshot().encodeToBytes();

}
