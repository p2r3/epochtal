const UtilError = require("./error.js");
const tmppath = require("../util/tmppath.js");
const leaderboard = require("../util/leaderboard.js");
const categories = require("../util/categories.js");
const users = require("../util/users.js");

const fs = require("fs");

const InitCanvasKit = require('canvaskit-wasm');
const CanvasKitFuture = InitCanvasKit();

// Load the font data
const fontData = fs.readFileSync(`${__dirname}/../pages/fonts/Quicksand.ttf`);
const emojisData = fs.readFileSync(`${__dirname}/../pages/fonts/fa-solid-900.ttf`);

/**
 * Converts ticks to a string format.
 *
 * @param {int} t Ticks
 * @returns {string} The formatted time string
 */
function ticksToString (t) {

  // Convert ticks to hours, minutes, and seconds
  let output = "";
  const hrs = Math.floor(t / 216000),
    min = Math.floor(t / 3600),
    sec = t % 3600 / 60;

  // Format the time string
  if (hrs !== 0) output += `${hrs}:${min % 60 < 10 ? "0" : ""}${min % 60}:`;
  else if (min !== 0) output += `${min}:`;
  if (min > 0 && sec < 10) output += "0";
  output += sec.toFixed(3);

  return output;

}

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

  // Send appropriate message to the discord server
  switch (command) {

    case "announce": {

      //await discordClient.channels.cache.get(context.data.discord.announce).send({ content, files });
      return "SUCCESS";

    }

    case "releaseMap": {

      // Get message content from args
      const [content] = args.slice(1);

      // Download map thumbnail
      const map = context.data.week.map;
      let thumbnail = map.thumbnail;
      if (!thumbnail.startsWith("http")) {
        thumbnail = `https://steamuserimages-a.akamaihd.net/ugc/${thumbnail}?impolicy=Letterbox&imh=360`;
      }

      const response = await fetch(thumbnail);
      const buffer = await response.arrayBuffer();

      // Render map release image
      const image = await renderMapReleaseAttachment(buffer, map);
      const imagePath = (await tmppath()) + ".png";
      await Bun.write(imagePath, image);

      // Send the image to the discord server
      try {
        const files = [{ attachment: imagePath, name: "leaderboard.png" }];
        await discordClient.channels.cache.get(context.data.discord.announce).send({ content, files });
      } finally {
        fs.unlinkSync(imagePath);
      }

      return "SUCCESS";

    }

    case "report": {

      //await discordClient.channels.cache.get(context.data.discord.report).send({ content, files });
      return "SUCCESS";

    }

    case "update": {

      const [category, steamid, improvement] = args.slice(1);

      // Create string from ticks
      const currBoard = await leaderboard(["get", category]);
      const currCategory = await categories(["get", category]);

      const run = currBoard.find(c => c.steamid === steamid);
      const runIndex = currBoard.findIndex(c => c.steamid === steamid);
      const user = await users(["get", steamid]);

      // Find faster and slower runners
      const fasterRun = runIndex > 0 ? currBoard[runIndex - 1] : null;
      const fasterUser = fasterRun ? (await users(["get", fasterRun.steamid])).name : null;
      const slowerRun = runIndex < currBoard.length - 1 ? currBoard[runIndex + 1] : null;
      const slowerUser = slowerRun ? (await users(["get", slowerRun.steamid])).name : null;

      // Render the leaderboard image
      const image = await renderUpdateAttachment(user.name, currCategory, run, improvement, fasterRun, fasterUser, slowerRun, slowerUser);
      const imagePath = (await tmppath()) + ".png";
      await Bun.write(imagePath, image);

      // Send the image to the discord server
      try {
        const files = [{ attachment: imagePath, name: "update.png" }];
        await discordClient.channels.cache.get(context.data.discord.update).send({ files });
      } finally {
        fs.unlinkSync(imagePath);
      }

      return "SUCCESS";

    }

  }

  throw new UtilError("ERR_COMMAND", args, context);

};

/**
 * Render the image attachement for a run update message
 *
 * @author PancakeTAS
 * @param {String} runner Runner who submitted the run
 * @param {Object} category Category of the run
 * @param {Object} run Run data
 * @param {Number} improvement Improvement over the previous run (or null)
 * @param {String} fasterRun Faster run data (or null)
 * @param {String} fasterUser Faster run user name
 * @param {String} slowerRun Slower run data (or null)
 * @param {String} slowerUser Slower run user name
 * @returns {Blob} Image data
 */
async function renderUpdateAttachment(runner, category, run, improvement, fasterRun, fasterUser, slowerRun, slowerUser) {

  // Create render context
  const CK = await CanvasKitFuture;

  const refWidth = 2000; // reference width on which all numbers are based
  const width = 1600; // desired width of the image

  const cardGap = 10 / refWidth * width; // gap above and below player cards
  const cardPadding = 33 / refWidth * width; // padding on all outer sides of a card
  const cardHeight = 226 / refWidth * width; // width/height of a card including padding
  const cardWidth = width;

  const deltaSize = 46 / refWidth * width; // size of the delta time text

  const height = cardHeight + cardGap + deltaSize * 1.5 + (slowerRun ? (cardGap + deltaSize * 1.50) : 0);

  const surface = CK.MakeSurface(width, height);
  const canvas = surface.getCanvas();
  const paint = new CK.Paint();
  const fontmgr = CK.FontMgr.FromData(emojisData, fontData);
  paint.setAntiAlias(true);

  const ctx = {
    CK, surface, canvas, paint, fontmgr,
    refWidth, width, height
  };

  // Draw top runner delta
  let headerHeight = 0;
  if (fasterRun) {
    const color =
        (fasterRun.placement == 1) ? new ctx.CK.Color(243, 214, 53, 0xFF)
      : (fasterRun.placement == 2) ? new ctx.CK.Color(149, 203, 225, 0xFF)
      : (fasterRun.placement == 3) ? new ctx.CK.Color(200, 137, 113, 0xFF)
      : new ctx.CK.Color(220, 220, 220, 0xFF);
    const delta = run.time - fasterRun.time;
    const suffix = ["st","nd","rd"][(((fasterRun.placement) + 90) % 100 - 10) % 10 - 1] || "th";

    let text = `${ticksToString(Math.abs(delta))} `;
    if (delta < 0) {
      text += "faster than ";
    } else {
      text += "slower than ";
    }

    text += fasterUser;
    if (category.portals) {
      text += `'s ${fasterRun.portals}p run`;
    }

    text += ` in ${fasterRun.placement + suffix} place`;
    if (fasterRun.placement == run.placement) {
      text = `tied with ${fasterUser} in ${fasterRun.placement + suffix} place`;
    }

    const style = getFontStyle(ctx, deltaSize, color, ctx.CK.FontWeight.Bold, ctx.CK.FontWidth.Bold);
    headerHeight = drawTextWithShadow(ctx, cardPadding*0.5, 0, width, text, style, ctx.CK.Color(0, 0, 0, 0xFF), 2, 2);
  }

  // Draw category name
  const categoryStyle = getFontStyle(ctx, deltaSize, new ctx.CK.Color(220, 220, 220, 0xFF), ctx.CK.FontWeight.Bold, ctx.CK.FontWidth.Bold);
  headerHeight = Math.max(headerHeight, drawTextWithShadow(ctx, 0, 0, width - 2, category.title, categoryStyle, ctx.CK.Color(0, 0, 0, 0xFF), 2, 2, ctx.CK.TextAlign.Right));

  // Draw runner card
  const timeString = category.portals ?
    `${ticksToString(run.time) + (run.segmented ? "*" : "")} (${run.portals}p)`
    : ticksToString(run.time);
  drawCard(
    ctx, { x: 0, y: cardGap + headerHeight, width: cardWidth, height: cardHeight }, cardPadding,
    runner, run.placement, timeString, improvement ? `-${ticksToString(improvement)}` : null, run.note
  );

  // Draw bottom runner delta
  if (slowerRun) {
    const color =
        (slowerRun.placement == 1) ? new ctx.CK.Color(243, 214, 53, 0xFF)
      : (slowerRun.placement == 2) ? new ctx.CK.Color(149, 203, 225, 0xFF)
      : (slowerRun.placement == 3) ? new ctx.CK.Color(200, 137, 113, 0xFF)
      : new ctx.CK.Color(220, 220, 220, 0xFF);

    const delta = slowerRun.time - run.time;
    const suffix = ["st","nd","rd"][(((slowerRun.placement) + 90) % 100 - 10) % 10 - 1] || "th";

    let text = `${ticksToString(Math.abs(delta))} `;
    if (delta < 0) {
      text += "slower than ";
    } else {
      text += "faster than ";
    }

    text += slowerUser;
    if (category.portals) {
      text += `'s ${slowerRun.portals}p run`;
    }

    text += ` in ${slowerRun.placement + suffix} place`;
    if (slowerRun.placement == run.placement) {
      text = `tied with ${slowerUser} in ${slowerRun.placement + suffix} place`;
    }

    const style = getFontStyle(ctx, deltaSize, color, ctx.CK.FontWeight.Bold, ctx.CK.FontWidth.Bold);
    drawTextWithShadow(ctx, cardPadding*0.5, 2 * cardGap + headerHeight + cardHeight + 2, width, text, style, ctx.CK.Color(0, 0, 0, 0xFF), 2, 2);
  }

  // Save the canvas to a buffer
  return surface.makeImageSnapshot().encodeToBytes();

}

/**
 * Render the image attachment for a map release message
 *
 * @param {Blob} thumbnailData Thumbnail image data
 * @param {Object} map Map data
 * @returns {Blob} Image data
 */
async function renderMapReleaseAttachment(thumbnailData, map) {

  // Create render context
  const CK = await CanvasKitFuture;

  const refWidth = 2000;
  const width = 1600;

  const padding = 20 / refWidth * width;
  const height = 325 / refWidth * width;

  const thumbnail = CK.MakeImageFromEncoded(thumbnailData);
  const thumbnailWidth = width * 0.25;
  const thumbnailHeight = thumbnailWidth / 16 * 9;
  const thumbnailRadius = 20 / refWidth * width;

  const surface = CK.MakeSurface(width, height);
  const canvas = surface.getCanvas();
  const paint = new CK.Paint();
  const fontmgr = CK.FontMgr.FromData(fontData, emojisData);
  paint.setAntiAlias(true);

  const ctx = {
    CK, surface, canvas, paint, fontmgr,
    refWidth, width, height
  };

  // Draw map release card
  drawCard(
    ctx, { x: 0, y: 0, width, height }, padding,
    "", 0, "", "", ""
  );

  // Draw map thumbnail
  drawRoundedImage(
    ctx, { x: padding, y: (height - thumbnailHeight) / 2, width: thumbnailWidth, height: thumbnailHeight },
    thumbnail, thumbnailRadius
  );

  // Draw map info
  const titleStyle = getFontStyle(ctx, 61 / refWidth * width, CK.WHITE, CK.FontWeight.Bold, CK.FontWidth.Bold);
  const authorStyle = getFontStyle(ctx, 61 / refWidth * width, CK.WHITE, CK.FontWeight.Light, CK.FontWidth.Normal, CK.FontSlant.Italic);
  const votesStyle = getFontStyle(ctx, 61 / refWidth * width, CK.WHITE);

  const infoBuilder = new CK.ParagraphBuilder.Make(new CK.ParagraphStyle({
    textStyle: titleStyle,
    color: CK.WHITE,
    textAlign: CK.TextAlign.Left,
    maxLines: 2
  }), ctx.fontmgr);

  infoBuilder.addText(map.title + "\n");
  infoBuilder.pushStyle(authorStyle);
  infoBuilder.addText(map.author);
  infoBuilder.pop();
  infoBuilder.addText("  ");
  votesStyle.color = CK.Color(23, 192, 233, 0xFF);
  infoBuilder.pushStyle(votesStyle);
  infoBuilder.addText(map.upvotes + " 👍");
  infoBuilder.pop();
  infoBuilder.addText("  ");
  votesStyle.color = CK.Color(232, 63, 22, 0xFF);
  infoBuilder.pushStyle(votesStyle);
  infoBuilder.addText(map.downvotes + " 👎");
  infoBuilder.pop();

  const infoParagraph = infoBuilder.build();
  infoParagraph.layout(width * 0.7);

  canvas.drawParagraph(infoParagraph, padding + thumbnailWidth + (width * 0.02), padding + 18);

  // Save the canvas to a buffer
  return surface.makeImageSnapshot().encodeToBytes();

}

/**
 * Draw a rounded box on the canvas
 *
 * @author PancakeTAS
 * @param {Object} ctx Rendering context
 * @param {Number} rect Rectangle to draw
 * @param {Number} radius Radius of the corners
 * @param {Number} stroke Border stroke width
 * @param {Number} fill Box fill color
 * @param {Number} border Border color
 */
function drawRoundedBox(ctx, rect, radius, stroke, fill, border) {

  // Fill the box
  ctx.paint.setStyle(ctx.CK.PaintStyle.Fill);
  ctx.paint.setColor(fill);

  ctx.canvas.drawRRect(ctx.CK.RRectXY(ctx.CK.XYWHRect(rect.x, rect.y, rect.width, rect.height), radius, radius), ctx.paint);

  // Draw the border
  ctx.paint.setStyle(ctx.CK.PaintStyle.Stroke);
  ctx.paint.setStrokeWidth(stroke);
  ctx.paint.setColor(border);

  ctx.canvas.drawRRect(ctx.CK.RRectXY(ctx.CK.XYWHRect(rect.x, rect.y, rect.width, rect.height), radius, radius), ctx.paint);

}

/**
 * Draw an image with rounded corners on the canvas
 *
 * @author PancakeTAS
 * @param {Object} ctx Rendering context
 * @param {Number} rect Rectangle to draw
 * @param {Image} image Image to draw
 * @param {Number} radius Radius of the corners
 */
function drawRoundedImage(ctx, rect, image, radius) {

  ctx.paint.setStyle(ctx.CK.PaintStyle.Fill);

  // Mask the image with a rounded rectangle
  const path = new ctx.CK.Path();
  path.addRRect(ctx.CK.RRectXY(ctx.CK.XYWHRect(rect.x, rect.y, rect.width, rect.height), radius, radius));

  ctx.canvas.save(); // push canvas state
  ctx.canvas.clipPath(path, ctx.CK.ClipOp.Intersect, true);

  // Draw the image
  ctx.canvas.drawImageRectOptions(
    image,
    ctx.CK.XYWHRect(0, 0, image.width(), image.height()),
    ctx.CK.XYWHRect(rect.x, rect.y, rect.width, rect.height),
    ctx.CK.FilterMode.Linear, ctx.CK.MipmapMode.Linear,
    ctx.paint
  );

  ctx.canvas.restore(); // pop canvas state

}

/**
 * Get the font style for the canvas
 *
 * @author PancakeTAS
 * @param {Object} ctx Rendering context
 * @param {Number} fontSize Size of the font
 * @param {Number} color Color of the font
 * @param {Number} weight Weight of the font
 * @param {Number} width Width of the font
 * @param {Number} slant Slant of the font
 * @returns {Object} Font style
 */
function getFontStyle(ctx, fontSize, color, weight = ctx.CK.FontWeight.Normal, width = ctx.CK.FontWeight.Normal, slant = ctx.CK.FontSlant.Normal) {
  return new ctx.CK.TextStyle({
    color,
    fontFamilies: ['Quicksand', 'Font Awesome 6 Free'],
    fontSize,
    fontStyle: { weight, width, slant }
  });
}

/**
 * Draw text with a drop shadow on the canvas
 *
 * @author PancakeTAS
 * @param {Object} ctx Rendering context
 * @param {Number} x X position of the text
 * @param {Number} y Y position of the text
 * @param {Number} width Width of the text
 * @param {String} text Text to draw
 * @param {Object} style Style of the text
 * @param {Number} shadowColor Color of the shadow
 * @param {Number} shadowOffsetX X offset of the shadow
 * @param {Number} shadowOffsetY Y offset of the shadow
 * @returns {Number} Text height
 */
function drawTextWithShadow(ctx, x, y, width, text, style, shadowColor, shadowOffsetX, shadowOffsetY, align = ctx.CK.TextAlign.Left) {

  // Draw the shadow
  const shadowBuilder = new ctx.CK.ParagraphBuilder.Make(new ctx.CK.ParagraphStyle({
    textStyle: new ctx.CK.TextStyle({
      color: shadowColor,
      fontFamilies: ['Quicksand', 'Font Awesome 6 Free'],
      fontSize: style.fontSize,
      fontStyle: { weight: style.fontStyle.weight, width: style.fontStyle.width, slant: style.fontStyle.slant }
    }),
    color: shadowColor,
    textAlign: align,
    maxLines: 1
  }), ctx.fontmgr);

  shadowBuilder.addText(text);

  const shadowParagraph = shadowBuilder.build();
  shadowParagraph.layout(width);

  ctx.canvas.drawParagraph(shadowParagraph, x + shadowOffsetX, y + shadowOffsetY);

  // Draw the text
  const textBuilder = new ctx.CK.ParagraphBuilder.Make(new ctx.CK.ParagraphStyle({
    textStyle: style,
    color: style.color,
    textAlign: align,
    maxLines: 1
  }), ctx.fontmgr);

  textBuilder.addText(text);

  const textParagraph = textBuilder.build();
  textParagraph.layout(width);

  ctx.canvas.drawParagraph(textParagraph, x, y);

  // Return the height of the text
  return textParagraph.getHeight();

}

/**
 * Draw a card on the canvas
 *
 * @author PancakeTAS
 * @param {Object} ctx Rendering context
 * @param {Object} rect Card rectangle
 * @param {Number} padding Padding on all sides
 * @param {string} runnerName Name of the runner
 * @param {Number} placementNumber Placement number
 * @param {string} timeString Time string
 * @param {string} deltaString Delta time string
 * @param {string} note Note
 */
function drawCard(ctx, rect, padding,
    runnerName, placementNumber, timeString, deltaString, note
) {

  const innerRect = {
    x: rect.x + padding,
    y: rect.y + padding,
    width: rect.width - padding * 2,
    height: rect.height - padding * 2
  };

  // Draw card background
  const bgColor = ctx.CK.Color(0x04, 0x04, 0x04, 0xFF);
  const borderColor = ctx.CK.Color(0xFF, 0xFF, 0xFF, 0xFF);
  const borderRadius = 20 / ctx.refWidth * ctx.width;
  const borderStroke = 4 / ctx.refWidth * ctx.width;

  drawRoundedBox(
    ctx,
    {
      x: rect.x + borderStroke,
      y: rect.y + borderStroke,
      width: rect.width - borderStroke*2,
      height: rect.height - borderStroke*2
    },
    borderRadius, borderStroke,
    bgColor, borderColor
  );

  // Draw left paragraph
  const textColor =
      (placementNumber == 1) ? new ctx.CK.Color(243, 214, 53, 0xFF)
    : (placementNumber == 2) ? new ctx.CK.Color(149, 203, 225, 0xFF)
    : (placementNumber == 3) ? new ctx.CK.Color(200, 137, 113, 0xFF)
    : new ctx.CK.Color(220, 220, 220, 0xFF);
  const textSize = 61 / ctx.refWidth * ctx.width;
  const boldStyle = getFontStyle(ctx, textSize, textColor, ctx.CK.FontWeight.Bold, ctx.CK.FontWidth.Bold);
  const normalStyle = getFontStyle(ctx, textSize, textColor);
  const deltaStyle = getFontStyle(ctx, textSize * 0.67, ctx.CK.Color(140, 140, 140, 0xFF));
  const paragraphBuilder = new ctx.CK.ParagraphBuilder.Make(new ctx.CK.ParagraphStyle({
    textStyle: boldStyle,
    color: textColor,
    textAlign: ctx.CK.TextAlign.Left,
    maxLines: 2
  }), ctx.fontmgr);

  paragraphBuilder.pushStyle(boldStyle);
  paragraphBuilder.addText(`${runnerName}\n`);
  paragraphBuilder.pop();

  paragraphBuilder.pushStyle(normalStyle);
  if (placementNumber != 0) paragraphBuilder.addText(`${placementNumber + (["st","nd","rd"][((placementNumber+90)%100-10)%10-1]||"th")} place in ${timeString}`);
  paragraphBuilder.pop();

  if (deltaString) {

    paragraphBuilder.pushStyle(deltaStyle);
    paragraphBuilder.addText(` (${deltaString})`);
    paragraphBuilder.pop();

  }

  const paragraph = paragraphBuilder.build();
  paragraph.layout(innerRect.width * 0.45);

  ctx.canvas.drawParagraph(paragraph, innerRect.x, innerRect.y);

  // Draw note paragraph
  if (note) {

    const noteColor = ctx.CK.Color(240, 240, 240, 0xFF);
    const noteStyle = getFontStyle(ctx, textSize * 0.67, noteColor, ctx.CK.FontWeight.Light, ctx.CK.FontWidth.Normal, ctx.CK.FontSlant.Italic);
    const noteBuilder = new ctx.CK.ParagraphBuilder.Make(new ctx.CK.ParagraphStyle({
      textStyle: noteStyle,
      color: noteColor,
      textAlign: ctx.CK.TextAlign.Left,
      maxLines: 3,
      ellipsis: "...\""
    }), ctx.fontmgr);

    noteBuilder.addText(`"${note}"`);

    const noteParagraph = noteBuilder.build();
    noteParagraph.layout(innerRect.width * 0.55);

    ctx.canvas.drawParagraph(noteParagraph, innerRect.x + (innerRect.width * 0.45), innerRect.y);

  }

}
