// Don't proceed with the animation on mobile
(function(a){if(/(android|bb\d+|meego).+mobile|avantgo|bada\/|blackberry|blazer|compal|elaine|fennec|hiptop|iemobile|ip(hone|od)|iris|kindle|lge |maemo|midp|mmp|mobile.+firefox|netfront|opera m(ob|in)i|palm( os)?|phone|p(ixi|re)\/|plucker|pocket|psp|series(4|6)0|symbian|treo|up\.(browser|link)|vodafone|wap|windows ce|xda|xiino|android|ipad|playbook|silk/i.test(a)||/1207|6310|6590|3gso|4thp|50[1-6]i|770s|802s|a wa|abac|ac(er|oo|s\-)|ai(ko|rn)|al(av|ca|co)|amoi|an(ex|ny|yw)|aptu|ar(ch|go)|as(te|us)|attw|au(di|\-m|r |s )|avan|be(ck|ll|nq)|bi(lb|rd)|bl(ac|az)|br(e|v)w|bumb|bw\-(n|u)|c55\/|capi|ccwa|cdm\-|cell|chtm|cldc|cmd\-|co(mp|nd)|craw|da(it|ll|ng)|dbte|dc\-s|devi|dica|dmob|do(c|p)o|ds(12|\-d)|el(49|ai)|em(l2|ul)|er(ic|k0)|esl8|ez([4-7]0|os|wa|ze)|fetc|fly(\-|_)|g1 u|g560|gene|gf\-5|g\-mo|go(\.w|od)|gr(ad|un)|haie|hcit|hd\-(m|p|t)|hei\-|hi(pt|ta)|hp( i|ip)|hs\-c|ht(c(\-| |_|a|g|p|s|t)|tp)|hu(aw|tc)|i\-(20|go|ma)|i230|iac( |\-|\/)|ibro|idea|ig01|ikom|im1k|inno|ipaq|iris|ja(t|v)a|jbro|jemu|jigs|kddi|keji|kgt( |\/)|klon|kpt |kwc\-|kyo(c|k)|le(no|xi)|lg( g|\/(k|l|u)|50|54|\-[a-w])|libw|lynx|m1\-w|m3ga|m50\/|ma(te|ui|xo)|mc(01|21|ca)|m\-cr|me(rc|ri)|mi(o8|oa|ts)|mmef|mo(01|02|bi|de|do|t(\-| |o|v)|zz)|mt(50|p1|v )|mwbp|mywa|n10[0-2]|n20[2-3]|n30(0|2)|n50(0|2|5)|n7(0(0|1)|10)|ne((c|m)\-|on|tf|wf|wg|wt)|nok(6|i)|nzph|o2im|op(ti|wv)|oran|owg1|p800|pan(a|d|t)|pdxg|pg(13|\-([1-8]|c))|phil|pire|pl(ay|uc)|pn\-2|po(ck|rt|se)|prox|psio|pt\-g|qa\-a|qc(07|12|21|32|60|\-[2-7]|i\-)|qtek|r380|r600|raks|rim9|ro(ve|zo)|s55\/|sa(ge|ma|mm|ms|ny|va)|sc(01|h\-|oo|p\-)|sdk\/|se(c(\-|0|1)|47|mc|nd|ri)|sgh\-|shar|sie(\-|m)|sk\-0|sl(45|id)|sm(al|ar|b3|it|t5)|so(ft|ny)|sp(01|h\-|v\-|v )|sy(01|mb)|t2(18|50)|t6(00|10|18)|ta(gt|lk)|tcl\-|tdg\-|tel(i|m)|tim\-|t\-mo|to(pl|sh)|ts(70|m\-|m3|m5)|tx\-9|up(\.b|g1|si)|utst|v400|v750|veri|vi(rg|te)|vk(40|5[0-3]|\-v)|vm40|voda|vulc|vx(52|53|60|61|70|80|81|83|85|98)|w3c(\-| )|webc|whit|wi(g |nc|nw)|wmlb|wonu|x700|yas\-|your|zeto|zte\-/i.test(a.substr(0,4))) throw " - mobile device detected, animation disabled"})(navigator.userAgent||navigator.vendor||window.opera);
// Don't proceed with animation if user has toggled power saving mode
if (localStorage.getItem("powerSaving") === "on") {
  throw " - power saving enabled, animation disabled";
}

const canvas = document.getElementById("bg-anim");
const ctx = canvas.getContext("2d");

// Downscaling because this silly animation is actually stupidly computationally expensive
const gscale = 0.5;

canvas.width = window.innerWidth * gscale;
canvas.height = window.innerHeight * gscale;

window.onresize = function () {
  canvas.width = window.innerWidth * gscale;
  canvas.height = window.innerHeight * gscale;
};

const dots = [];
const minDistance = 200 * gscale;
const maxSpeed = 0.75 * gscale;

var dotCount = 50;

var avoidCenterRadius = 0;
var collideWithEdges = true;

class Dot {

  constructor (x, y, size) {

    this.x = x;
    this.y = y;
    this.size = size * gscale;
    this.speedX = Math.random() * maxSpeed * 2 - maxSpeed;
    this.speedY = Math.random() * maxSpeed * 2 - maxSpeed;

  }

  draw () {

    ctx.beginPath();
    ctx.arc(this.x, this.y, this.size, 0, 2 * Math.PI);
    ctx.fillStyle = "white";
    ctx.fill();

  }

  update () {

    if (avoidCenterRadius !== 0) {

      const nextX = this.x + this.speedX;
      const nextY = this.y + this.speedY;

      const nextDistance = Math.sqrt(Math.pow(nextX - canvas.width / 2, 2) + Math.pow(nextY - canvas.height / 2, 2));
      const currDistance = Math.sqrt(Math.pow(this.x - canvas.width / 2, 2) + Math.pow(this.y - canvas.height / 2, 2));

      if (nextDistance < avoidCenterRadius && currDistance >= avoidCenterRadius) {
        this.speedX = -this.speedX;
        this.speedY = -this.speedY;
      }

    }

    this.x += this.speedX;
    this.y += this.speedY;

    if (collideWithEdges) {
      if ((this.x < 0 && this.speedX < 0) || (this.x > canvas.width && this.speedX > 0)) {
        this.speedX = -this.speedX;
      }

      if ((this.y < 0 && this.speedY < 0) || (this.y > canvas.height && this.speedY > 0)) {
        this.speedY = -this.speedY;
      }
    }

  }

  connect (dots) {
    dots.forEach((dot) => {
      const distance = Math.sqrt(Math.pow(this.x - dot.x, 2) + Math.pow(this.y - dot.y, 2));

      if (distance < minDistance) {
        ctx.beginPath();
        ctx.moveTo(this.x, this.y);
        ctx.lineTo(dot.x, dot.y);
        ctx.strokeStyle = `rgba(255, 255, 255, ${1 - distance / minDistance})`;
        ctx.lineWidth = 1;
        ctx.stroke();
      }

    });
  }

}

function init () {
  for (let i = 0; i < dotCount; i++) {
    const dot = new Dot(Math.random() * canvas.width, Math.random() * canvas.height, Math.random() * 2 + 6);
    dots.push(dot);
  }
}

const fpsCap = 30
function animate () {
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  dots.forEach((dot) => {
    dot.draw();
    dot.update();
    dot.connect(dots.filter((otherDot) => dot !== otherDot));
  });
  
  setTimeout(() => requestAnimationFrame(animate), 1000/fpsCap)
  
}

init();
animate();
