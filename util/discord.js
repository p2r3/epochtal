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
      const image = await renderLeaderboard();
      const imagePath = (await tmppath()) + ".png";
      await Bun.write(imagePath, image);

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
    fontFamilies: ['Quicksand'],
    fontSize,
    fontStyle: { weight, width, slant }
  });
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
/*async function renderMapRelease(thumbnailData, title, author, upvotes, downvotes) {

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
  infoBuilder.addText(upvotes + " 👍");
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

}*/

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
 * @param {string} comment Comment
 * @param {string} arrows Arrows string
 * @param {string} diff Difference string
 */
function drawCard(ctx, rect, padding,
    runnerName, placementNumber, timeString, deltaString, comment, arrows, diff
) {

  const arrowLeftPadding = 50 / ctx.refWidth * ctx.width;
  const diffRightPadding = 250 / ctx.refWidth * ctx.width;
  const innerRect = {
    x: rect.x + padding + arrowLeftPadding,
    y: rect.y + padding,
    width: rect.width - padding * 2 - arrowLeftPadding - diffRightPadding,
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
      x: rect.x + borderStroke + arrowLeftPadding,
      y: rect.y + borderStroke,
      width: rect.width - borderStroke*2 - arrowLeftPadding - diffRightPadding,
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
  }), ctx.CK.FontMgr.FromData(fontData)); // FIXME: preserve fontmgr

  paragraphBuilder.pushStyle(boldStyle);
  paragraphBuilder.addText(`${runnerName}\n`);
  paragraphBuilder.pop();

  paragraphBuilder.pushStyle(normalStyle);
  paragraphBuilder.addText(`${placementNumber + (["st","nd","rd"][((placementNumber+90)%100-10)%10-1]||"th")} place in ${timeString}`);
  paragraphBuilder.pop();

  if (deltaString) {

    paragraphBuilder.pushStyle(deltaStyle);
    paragraphBuilder.addText(` (${deltaString})`);
    paragraphBuilder.pop();

  }

  const paragraph = paragraphBuilder.build();
  paragraph.layout(innerRect.width * 0.4);

  ctx.canvas.drawParagraph(paragraph, innerRect.x, innerRect.y);

  // Draw comment paragraph
  if (comment) {

    const commentColor = ctx.CK.Color(240, 240, 240, 0xFF);
    const commentStyle = getFontStyle(ctx, textSize * 0.67, commentColor, ctx.CK.FontWeight.Light, ctx.CK.FontWidth.Normal, ctx.CK.FontSlant.Italic);
    const commentBuilder = new ctx.CK.ParagraphBuilder.Make(new ctx.CK.ParagraphStyle({
      textStyle: commentStyle,
      color: commentColor,
      textAlign: ctx.CK.TextAlign.Left,
      maxLines: 3,
      ellipsis: "...\""
    }), ctx.CK.FontMgr.FromData(fontData)); // FIXME: preserve fontmgr, emoji support

    commentBuilder.addText(`"${comment}"`);

    const commentParagraph = commentBuilder.build();
    commentParagraph.layout(innerRect.width * 0.6);

    ctx.canvas.drawParagraph(commentParagraph, innerRect.x + (innerRect.width * 0.4), innerRect.y);

  }

  // Draw arrows paragraph
  if (arrows) {

    const arrowsColor = (arrows === "up") ? ctx.CK.Color(23, 192, 233, 0xFF) : ctx.CK.Color(242, 73, 32, 0xFF);
    const arrowsSize = 45 / ctx.refWidth * ctx.width;
    const arrowsStyle = getFontStyle(ctx, arrowsSize, arrowsColor);
    const arrowsBuilder = new ctx.CK.ParagraphBuilder.Make(new ctx.CK.ParagraphStyle({
      textStyle: arrowsStyle,
      color: arrowsColor,
      textAlign: ctx.CK.TextAlign.Left,
      maxLines: 4
    }), ctx.CK.FontMgr.FromData(emojisData)); // FIXME: preserve fontmgr

    arrowsBuilder.addText(arrows === "up" ? "\uf0d8\n".repeat(4) : "\uf0d7\n".repeat(4));

    const arrowsParagraph = arrowsBuilder.build();
    arrowsParagraph.layout(arrowLeftPadding);

    const arrowsHeight = arrowsParagraph.getHeight();
    ctx.canvas.drawParagraph(arrowsParagraph, rect.x, rect.y + (rect.height / 2) - (arrowsHeight / 2));

  }

  // Draw diff paragraph
  if (diff) {

    const diffColor = getFontStyle(ctx, textSize * 0.8, ctx.CK.Color(0xFF, 0xFF, 0xFF, 0xFF));
    const diffBuilder = new ctx.CK.ParagraphBuilder.Make(new ctx.CK.ParagraphStyle({
      textStyle: diffColor,
      color: ctx.CK.Color(240, 240, 240, 0xFF),
      textAlign: ctx.CK.TextAlign.Left,
      maxLines: 1
    }), ctx.CK.FontMgr.FromData(fontData)); // FIXME: preserve fontmgr

    diffBuilder.addText(diff);

    const diffParagraph = diffBuilder.build();
    diffParagraph.layout(diffRightPadding);

    const diffHeight = diffParagraph.getHeight();
    ctx.canvas.drawParagraph(diffParagraph, rect.x + rect.width - diffRightPadding + (20 / ctx.refWidth * ctx.width), rect.y + (rect.height / 2) - (diffHeight / 2));

  }

}

async function renderLeaderboard() {

  const CK = await CanvasKitFuture;
  const refWidth = 2000; // reference width on which all numbers are based
  const width = 1600; // desired width of the image

  const playersAbove = 1; // amount of player cards above/below the submitter
  const playersBelow = 1;
  const playersTotal = playersAbove + playersBelow + 1; // total amount of rendered player cards

  const cardGap = 35 / refWidth * width; // gap between player cards
  const cardPadding = 33.2 / refWidth * width; // padding on all outer sides of a card // FIXME: holy shit 33.2 pixels how the fuck
  const cardHeight = 226 / refWidth * width; // width/height of a card including padding // FIXME: this should include the padding
  const cardWidth = width;

  const height = (playersTotal * cardHeight) + ((playersTotal - 1) * cardGap);

  const surface = CK.MakeSurface(width, height);
  const canvas = surface.getCanvas();
  const paint = new CK.Paint();
  paint.setAntiAlias(true);

  const ctx = {
    CK, surface, canvas, paint,
    refWidth, width, height
  };
  console.log(ctx);

  // Draw player cards
  const obnoxiouslyLongRunComment = "The mitochondrion is often referred to as the powerhouse of the cell. This is because mitochondria are responsible for producing the energy currency of the cell, ATP (adenosine triphosphate), through a process known as oxidative phosphorylation. Mitochondria are unique organelles within eukaryotic cells that have their own DNA and are capable of replicating independently of the cell in which they reside. The structure of mitochondria includes an outer membrane, an intermembrane space, an inner membrane, and a matrix. The inner membrane is highly folded into structures known as cristae, which increase the surface area available for the electron transport chain and ATP synthesis. The matrix contains enzymes that are involved in the Krebs cycle, also known as the citric acid cycle, which is a key component of cellular respiration. The energy produced by mitochondria is essential for various cellular functions, including muscle contraction, nerve impulse propagation, and chemical synthesis. Without mitochondria, cells would not be able to generate sufficient energy to sustain life. The study of mitochondria has also revealed their role in other cellular processes such as apoptosis (programmed cell death), calcium signaling, and the regulation of the cellular redox state. Mitochondrial dysfunction has been implicated in a variety of diseases, including neurodegenerative disorders, metabolic syndromes, and cardiovascular diseases. Research into mitochondrial biology continues to be a vibrant and important field, with implications for understanding fundamental cellular processes and developing therapeutic strategies for a range of diseases.";

  let y = 0;
  for (let i = 0; i < playersAbove; i++) {
    drawCard(
      ctx, { x: 0, y, width: cardWidth, height: cardHeight }, cardPadding,
      "Burger40", (i+1+2), "1.133", null, "i am good at portal 2", "up", "-1.000"
    );
    y += cardHeight + cardGap;
  }
  drawCard(
    ctx, { x: 0, y, width: cardWidth, height: cardHeight }, cardPadding,
    "PancakeTAS", 2+2, "2.133", "-0.100", obnoxiouslyLongRunComment, null
  );
  y += cardHeight + cardGap;
  for (let i = 0; i < playersBelow; i++) {
    drawCard(
      ctx, { x: 0, y, width: cardWidth, height: cardHeight }, cardPadding,
      "PortalRunner", (i+1+playersAbove+1+2), "8.133", null, null, "down", "+499.000"
    );
    y += cardHeight + cardGap;
  }

  // Save the canvas to a buffer
  return surface.makeImageSnapshot().encodeToBytes();

}