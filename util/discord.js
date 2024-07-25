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
 * Render the map release canvas into a buffer
 *
 * @author PancakeTAS
 * @param {Array} thumbnail Byte array of the map thumbnail
 * @param {string} title Title of the map
 * @param {string} author Author of the map
 * @param {number} upvotes The number of upvotes
 * @param {number} downvotes The number of downvotes
 * @returns {string} Base64 encoded png image
 */
async function render(thumbnail, title, author, upvotes, downvotes) {

  const CanvasKit = await CanvasKitFuture;

  // Create the canvas
  const rcanvas = {
    width: 922 * 2,
    height: 150 * 2,
    padding: 3840 * 0.5 / 100
  };

  const surface = CanvasKit.MakeSurface(rcanvas.width, rcanvas.height);
  const canvas = surface.getCanvas();

  // Prepare the paint object
  const paint = new CanvasKit.Paint();
  paint.setAntiAlias(true);

  // Draw dark background and border
  const rinner = {
    width: rcanvas.width - rcanvas.padding * 2,
    height: rcanvas.height - rcanvas.padding * 2
  };

  const rborder = {
    stroke: 4,
    radius: 20,
    color: CanvasKit.Color(0xFF, 0xFF, 0xFF, 0xFF),
    fillcolor: CanvasKit.Color(0x04, 0x04, 0x04, 0xFF),
    x: 4,
    y: 4,
    width: rcanvas.width - 4*2,
    height: rcanvas.height - 4*2
  };

  paint.setStyle(CanvasKit.PaintStyle.Fill);
  paint.setColor(rborder.fillcolor);

  canvas.drawRRect(
    CanvasKit.RRectXY(
      CanvasKit.XYWHRect(rborder.x, rborder.y, rborder.width, rborder.height),
      rborder.radius, rborder.radius
    ),
    paint
  );

  paint.setStyle(CanvasKit.PaintStyle.Stroke);
  paint.setStrokeWidth(rborder.stroke);
  paint.setColor(rborder.color);

  canvas.drawRRect(
    CanvasKit.RRectXY(
      CanvasKit.XYWHRect(rborder.x, rborder.y, rborder.width, rborder.height),
      rborder.radius, rborder.radius
    ),
    paint
  );

  // Draw map thumbnail
  const map = CanvasKit.MakeImageFromEncoded(thumbnail);
  const rthumbnail = {
    radius: 20,
    x: rcanvas.padding,
    y: rcanvas.padding + (rinner.height - (rinner.width * 0.25 / 16 * 9)) / 2,
    width: rinner.width * 0.25,
    height: rinner.width * 0.25 / 16 * 9
  };

  paint.setStyle(CanvasKit.PaintStyle.Fill);

  const path = new CanvasKit.Path();
  path.addRRect(
    CanvasKit.XYWHRect(rthumbnail.x, rthumbnail.y, rthumbnail.width, rthumbnail.height),
    rthumbnail.radius,
    rthumbnail.radius
  );

  canvas.save();
  canvas.clipPath(path, CanvasKit.ClipOp.Intersect, true);

  canvas.drawImageRectOptions(
    map,
    CanvasKit.XYWHRect(0, 0, map.width(), map.height()),
    CanvasKit.XYWHRect(rthumbnail.x, rthumbnail.y, rthumbnail.width, rthumbnail.height),
    CanvasKit.FilterMode.Linear,
    CanvasKit.MipmapMode.Linear,
    paint
  );

  canvas.restore();

  // Draw map info
  const rinfo = {
    x: rthumbnail.x + rthumbnail.width + (rinner.width * 0.02),
    y: rcanvas.padding + 18,
    color: CanvasKit.Color(0xFF, 0xFF, 0xFF, 0xFF)
  };

  paint.setStyle(CanvasKit.PaintStyle.Fill);
  paint.setColor(rinfo.color);
  paint.setBlendMode(CanvasKit.BlendMode.SrcOver);

  const titleStyle = new CanvasKit.ParagraphStyle({ // $ExpectType ParagraphStyle
    textStyle: {
        color: CanvasKit.WHITE,
        fontFamilies: ['Quicksand'],
        fontSize: 61,
        fontStyle: {
          weight: 400,
          width: CanvasKit.FontWidth.Bold,
          slant: CanvasKit.FontSlant.Normal
        }
    },
    textAlign: CanvasKit.TextAlign.Left,
    maxLines: 2,
    disableHinting: true
  });
  const authorStyle = new CanvasKit.TextStyle({
    color: CanvasKit.WHITE,
    fontFamilies: ['Quicksand', 'Font Awesome 6 Free'],
    fontSize: 61,
    fontStyle: {
      weight: 300,
      width: CanvasKit.FontWidth.Normal,
      slant: CanvasKit.FontSlant.Italic
    }
  });
  const votesStyle = new CanvasKit.TextStyle({
    fontFamilies: ['Quicksand', 'Font Awesome 6 Free'],
    fontSize: 61
  });
  const infoBuilder = new CanvasKit.ParagraphBuilder.Make(titleStyle, CanvasKit.FontMgr.FromData(fontData, emojisData));

  infoBuilder.addText(title + "\n");

  infoBuilder.pushStyle(authorStyle);
  infoBuilder.addText(author);
  infoBuilder.pop();
  infoBuilder.addText("  ");
  votesStyle.color = CanvasKit.Color(23, 192, 233, 0xFF);
  infoBuilder.pushStyle(votesStyle);
  infoBuilder.addText(upvotes + " 👍");
  infoBuilder.pop();
  infoBuilder.addText("  ");
  votesStyle.color = CanvasKit.Color(232, 63, 22, 0xFF);
  infoBuilder.pushStyle(votesStyle);
  infoBuilder.addText(downvotes + " 👎");
  infoBuilder.pop();

  const infoParagraph = infoBuilder.build();
  infoParagraph.layout(rinner.width * 0.7);
  canvas.drawParagraph(infoParagraph, rinfo.x, rinfo.y);

  // Save the canvas to a buffer
  return surface.makeImageSnapshot().encodeToBytes();

}
