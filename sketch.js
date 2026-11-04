// ===== 圖片資源變數 =====
let stopImg;         // 站立（STOP）圖片
let walkImg;         // 走路（WALK）圖片
let runImg;          // 跑步（RUN）圖片
let jumpImg;         // 跳躍（JUMP）圖片
let slideImgs = [];  // 滑壘（Slide base）的 5 張獨立圖片（0.png ~ 4.png）

// ===== 每張圖片內的影格數量 =====
const STOP_FRAMES = 2; // STOP 圖片共 2 張
const WALK_FRAMES = 4; // WALK 圖片共 4 張
const RUN_FRAMES = 7;  // RUN 圖片共 7 張
const JUMP_FRAMES = 4; // JUMP 圖片共 4 張
const SLIDE_COUNT = 5; // 滑壘共 5 張（0.png ~ 4.png）

// ===== 角色顯示與移動設定 =====
const SCALE_FACTOR = 3;       // 角色放大倍數
const WALK_SPEED = 5;         // 走路速度（每幀移動的像素）
const RUN_SPEED = 12;         // 跑步速度（每幀移動的像素）
const GRAVITY = 1;            // 重力：每幀讓向下的速度增加多少
const JUMP_POWER = 22;        // 第一段跳的力道
const DOUBLE_JUMP_POWER = 18; // 第二段跳（二段跳）的力道
const MAX_JUMPS = 2;          // 最多可以連跳幾次（2 = 二段跳）
const ANIM_SPEED = 8;         // 一般動畫切換速度：數字越小換圖越快
const SLIDE_SPEED = 16;       // 滑壘起始速度（之後會越滑越慢）
const SLIDE_FRAME_TICKS = 6;  // 滑壘每一張圖停留的幀數

// ===== 場景與互動設定 =====
const WORLD_W = 4400;      // 整個關卡的總寬度（像素）
const GROUND_MARGIN = 120; // 地面離畫面底部的距離
const BASE_TOL = 80;       // 滑壘停下時，離壘包中心多近才算安全上壘
const COIN_COUNT = 12;     // 場上棒球的數量
const COIN_LOW = 300;      // 低處棒球的高度（單跳就拿得到）
const COIN_HIGH = 520;     // 高處棒球的高度（要二段跳才拿得到）
const COIN_R = 22;         // 棒球的半徑
const COIN_HIT = 100;      // 角色身體中心離棒球多近就算撿到

// ===== 角色狀態變數 =====
let x;                    // 角色在「關卡世界」中的 x 座標
let groundY;              // 地面的 y 座標（角色腳底的位置）
let y;                    // 角色目前腳底的 y 座標（跳起來時會改變）
let vy = 0;               // 角色的垂直速度（正數向下，負數向上）
let facing = 1;           // 面向方向：1 = 朝右，-1 = 朝左
let sliding = false;      // 是否正在滑壘
let slideTimer = 0;       // 滑壘已經進行了幾幀
let slideRequest = false; // 是否剛按下滑壘鍵（只觸發一次）
let jumpRequest = false;  // 是否剛按下跳躍鍵（只觸發一次）
let jumpsUsed = 0;        // 目前這次空中已經跳了幾段
let jumpTick = 0;         // 自從最近一次起跳過了幾幀

// ===== 場景與遊戲狀態變數 =====
let bases = [];           // 壘包清單
let coins = [];           // 棒球清單
let particles = [];       // 特效粒子（塵土、二段跳光圈）
let popups = [];          // 飄出來的文字（SAFE!、+10…）
let score = 0;            // 分數
let showHints = true;     // 是否顯示操作提示

// preload() 會在 setup() 之前執行，用來先載入圖片
function preload() {
  stopImg = loadImage('1/STOP/STOP.png'); // 載入 STOP 圖片
  walkImg = loadImage('1/WALK/WALK.png'); // 載入 WALK 圖片
  runImg = loadImage('1/RUN/RUN.png');    // 載入 RUN 圖片
  jumpImg = loadImage('1/JUMP/JUMP.png'); // 載入 JUMP 圖片
  // 用迴圈依序載入滑壘的 0.png ~ 4.png
  for (let i = 0; i < SLIDE_COUNT; i++) {
    slideImgs.push(loadImage('1/Slide base/' + i + '.png')); // 放進陣列
  }
}

// setup() 只會執行一次，用來做初始設定
function setup() {
  createCanvas(windowWidth, windowHeight); // 建立全螢幕畫布
  groundY = height - GROUND_MARGIN;        // 地面位置：靠近畫面下方
  imageMode(CENTER);                       // 圖片以中心點作為繪製基準
  textFont('sans-serif');                  // 文字使用系統無襯線字型（可顯示中文）
  resetGame();                             // 初始化（或重新開始）遊戲
}

// resetGame() 把角色、壘包、棒球、分數都放回初始狀態
function resetGame() {
  x = 200;                 // 角色從關卡左側出發
  y = groundY;             // 站在地面上
  vy = 0;                  // 垂直速度歸零
  facing = 1;              // 面向右邊
  sliding = false;         // 沒有在滑壘
  jumpsUsed = 0;           // 連跳次數歸零
  score = 0;               // 分數歸零
  particles = [];          // 清空特效
  popups = [];             // 清空飄字
  // 建立 4 個壘包：x 是在關卡中的位置
  bases = [
    { x: 900,  label: '1B',   done: false },
    { x: 1900, label: '2B',   done: false },
    { x: 2900, label: '3B',   done: false },
    { x: 3900, label: 'HOME', done: false }
  ];
  coins = []; // 先清空棒球清單
  // 依序擺放棒球：一個低、一個高交替出現
  for (let i = 0; i < COIN_COUNT; i++) {
    coins.push({
      x: 450 + i * 310,                          // 每顆間隔 310 像素
      h: (i % 2 === 0) ? COIN_LOW : COIN_HIGH,   // 偶數顆放低處，奇數顆放高處
      taken: false                               // 還沒被撿走
    });
  }
}

// keyPressed() 在「按下按鍵的那一瞬間」只會執行一次
function keyPressed() {
  if (keyCode === DOWN_ARROW) slideRequest = true;                // 下方向鍵 → 要滑壘
  if (keyCode === UP_ARROW || keyCode === 32) jumpRequest = true; // 上方向鍵或空白鍵 → 要跳躍
  if (key === 'h' || key === 'H') showHints = !showHints;         // H → 顯示／隱藏操作提示
  if (key === 'r' || key === 'R') resetGame();                    // R → 重新開始
}

// draw() 會不斷重複執行，每秒約 60 次
function draw() {
  // ----- 1. 讀取按鍵狀態 -----
  let right = keyIsDown(RIGHT_ARROW); // 是否按住右方向鍵
  let left = keyIsDown(LEFT_ARROW);   // 是否按住左方向鍵
  let running = keyIsDown(SHIFT);     // 是否按住 Shift（按著就是跑步）

  // ----- 2. 是否開始滑壘（要在地面上才能滑）-----
  if (slideRequest && !sliding && y >= groundY) { // 有滑壘請求、沒在滑、且站在地面
    sliding = true;   // 進入滑壘狀態
    slideTimer = 0;   // 計時歸零
  }
  slideRequest = false; // 請求已處理，清除

  // ----- 3. 跳躍與二段跳（滑壘中不能跳）-----
  if (jumpRequest && !sliding && jumpsUsed < MAX_JUMPS) {            // 有跳躍請求且還有剩餘跳躍次數
    vy = (jumpsUsed === 0) ? -JUMP_POWER : -DOUBLE_JUMP_POWER;      // 第一段用大力道，第二段用小一點的
    jumpsUsed++;                                                     // 已使用的跳躍次數加 1
    jumpTick = 0;                                                    // 重新計算起跳後的幀數（讓跳躍動畫重播）
    if (jumpsUsed === 2) {                                           // 如果這是第二段跳
      burst(x, y - 20, 12, [255, 255, 255]);                         // 在腳邊炸出一圈白色光圈
    }
  }
  jumpRequest = false; // 請求已處理，清除

  // ----- 4. 水平移動 -----
  let moving = false; // 預設角色沒有在水平移動
  if (sliding) {
    // 滑壘中：往面向的方向滑，速度越來越慢
    slideTimer++;                                         // 滑壘計時加 1
    let total = SLIDE_COUNT * SLIDE_FRAME_TICKS;          // 滑壘總共持續的幀數
    x += facing * SLIDE_SPEED * (1 - slideTimer / total); // 速度隨時間遞減，慢慢停下
    if (frameCount % 2 === 0) {                           // 每兩幀噴一次塵土
      particles.push({                                    // 新增一顆塵土粒子
        x: x - facing * 50, y: groundY - 5,               // 出現在角色身後的腳邊
        vx: -facing * random(0.5, 2.5), vy: random(-3, -0.5), // 往後、往上飄
        life: 30, size: random(8, 16), c: [190, 160, 130]     // 壽命、大小、顏色
      });
    }
    if (slideTimer >= total) {                            // 滑壘時間到
      sliding = false;                                    // 結束滑壘
      checkBaseSafe();                                    // 檢查有沒有成功滑到壘包上
    }
  } else {
    let speed = running ? RUN_SPEED : WALK_SPEED; // 跑步用較快的速度，否則用走路速度
    if (right) {          // 如果按住右鍵
      facing = 1;         // 面向右邊
      x += speed;         // 往右移動
      moving = true;      // 標記角色正在移動
    } else if (left) {    // 否則如果按住左鍵
      facing = -1;        // 面向左邊（稍後會把圖片翻轉）
      x -= speed;         // 往左移動
      moving = true;      // 標記角色正在移動
    }
  }
  x = constrain(x, 0, WORLD_W); // 限制角色不能跑出關卡範圍

  // ----- 5. 重力與落地 -----
  vy += GRAVITY;          // 重力讓速度持續向下增加
  y += vy;                // 用速度更新 y 座標
  jumpTick++;             // 起跳後的幀數加 1
  if (y >= groundY) {     // 如果落到地面以下
    y = groundY;          // 把角色放回地面
    vy = 0;               // 垂直速度歸零
    jumpsUsed = 0;        // 落地後，可以跳的次數恢復
  }
  let inAir = (y < groundY); // 角色是否在空中

  // ----- 6. 撿棒球 -----
  for (let c of coins) {                              // 逐一檢查每顆棒球
    if (c.taken) continue;                            // 已經撿過的就跳過
    let cy = groundY - c.h;                           // 棒球的 y 座標
    if (dist(x, y - 140, c.x, cy) < COIN_HIT) {       // 角色身體中心離棒球夠近
      c.taken = true;                                 // 標記為已撿走
      score += 10;                                    // 加 10 分
      addPopup('+10', c.x, cy);                       // 飄出 +10
      burst(c.x, cy, 8, [255, 220, 120]);             // 噴出一點金色粒子
    }
  }

  // ----- 7. 更新特效 -----
  for (let p of particles) {  // 逐一更新每顆粒子
    p.x += p.vx;              // 水平移動
    p.y += p.vy;              // 垂直移動
    p.vy += 0.1;              // 受一點點重力
    p.life--;                 // 壽命減 1
  }
  particles = particles.filter(p => p.life > 0); // 移除壽命用完的粒子
  for (let t of popups) t.life--;                // 飄字的壽命減 1
  popups = popups.filter(t => t.life > 0);       // 移除壽命用完的飄字

  // ----- 8. 鏡頭：讓角色盡量保持在畫面中央 -----
  let camX = constrain(x - width / 2, 0, max(0, WORLD_W - width)); // 鏡頭的左邊界

  // ----- 9. 繪製場景 -----
  drawScene(camX); // 背景、地面、壘包、棒球

  // ----- 10. 依狀態選擇圖片、影格數與目前影格 -----
  let img;            // 這一幀要使用的圖片
  let frames;         // 這張圖片裡的影格數量
  let currentFrame;   // 目前要顯示第幾張（從 0 開始）
  if (sliding) {                         // 滑壘中
    let idx = min(floor(slideTimer / SLIDE_FRAME_TICKS), SLIDE_COUNT - 1); // 依時間換算第幾張
    img = slideImgs[idx];                // 使用對應的滑壘圖片
    frames = 1;                          // 每張滑壘圖片只有 1 個影格
    currentFrame = 0;                    // 固定顯示第 0 格
  } else if (inAir) {                    // 在空中 → 跳躍動作（分段）
    img = jumpImg;                       // 使用 JUMP 圖片
    frames = JUMP_FRAMES;                // 共 4 張
    if (jumpTick < 5) currentFrame = 0;       // 剛起跳：第 1 張（起跳）
    else if (vy < -3) currentFrame = 1;       // 快速上升：第 2 張
    else if (vy < 8) currentFrame = 2;        // 接近最高點、開始下降：第 3 張
    else currentFrame = 3;                    // 快速下墜：第 4 張
    currentFrame = min(currentFrame, frames - 1); // 避免超出影格數
  } else {
    if (moving && (running || facing === -1)) { // 往左移動，或按住 Shift 移動 → 跑步動作
      img = runImg;
      frames = RUN_FRAMES;
    } else if (moving && facing === 1) {        // 往右走 → 走路動作
      img = walkImg;
      frames = WALK_FRAMES;
    } else {                                    // 其他（不動）→ 站立圖片
      img = stopImg;
      frames = STOP_FRAMES;
    }
    currentFrame = floor(frameCount / ANIM_SPEED) % frames; // 循環播放影格
  }

  // ----- 11. 繪製角色 -----
  let frameW = img.width / frames; // 單一影格寬度 = 整張寬度 ÷ 張數
  let frameH = img.height;         // 單一影格高度 = 圖片高度
  push();                                     // 儲存繪圖狀態
  translate(x - camX, y);                     // 移到角色在「畫面上」的位置（世界座標減去鏡頭）
  scale(facing * SCALE_FACTOR, SCALE_FACTOR); // 放大角色；facing 為 -1 時左右翻轉
  // 圖片往上移半個高度，讓腳底對齊地面
  image(img, 0, -frameH / 2, frameW, frameH, currentFrame * frameW, 0, frameW, frameH);
  pop();                                      // 還原繪圖狀態

  // ----- 12. 特效、飄字與介面 -----
  drawParticles(camX); // 畫粒子（塵土、光圈）
  drawPopups(camX);    // 畫飄字
  drawHUD();           // 畫分數與操作提示
}

// checkBaseSafe() 在滑壘結束時，檢查角色是否停在壘包上
function checkBaseSafe() {
  let hit = false;                                        // 記錄有沒有滑進壘包
  for (let b of bases) {                                  // 逐一檢查每個壘包
    if (!b.done && abs(x - b.x) < BASE_TOL) {             // 還沒完成，而且角色停在壘包範圍內
      b.done = true;                                      // 標記這個壘包已完成
      score += 100;                                       // 加 100 分
      addPopup('SAFE! +100', b.x, groundY - 140);         // 飄出 SAFE!
      burst(b.x, groundY - 10, 14, [120, 200, 120]);      // 噴出綠色粒子
      hit = true;                                         // 記錄成功
    }
  }
  if (!hit) {                                             // 如果沒有成功
    for (let b of bases) {                                // 再看看是不是差一點
      if (!b.done && abs(x - b.x) < BASE_TOL * 2.5) {     // 距離壘包不遠
        addPopup('差一點！', x, groundY - 200);           // 提示差一點
        break;                                            // 只提示一次
      }
    }
  }
}

// addPopup() 新增一段會往上飄的文字
function addPopup(txt, px, py) {
  popups.push({ txt: txt, x: px, y: py, life: 60 }); // 文字、世界座標、壽命 60 幀
}

// burst() 在指定位置向四周噴出一圈粒子
function burst(px, py, n, c) {
  for (let i = 0; i < n; i++) {            // 產生 n 顆粒子
    let a = TWO_PI * i / n;                // 平均分配每顆粒子的角度
    particles.push({                       // 新增粒子
      x: px, y: py,                        // 從指定位置出發
      vx: cos(a) * 4, vy: sin(a) * 2,      // 依角度往四周飛（垂直方向壓扁一點）
      life: 22, size: 10, c: c             // 壽命、大小、顏色
    });
  }
}

// drawScene() 畫背景、地面、壘包與棒球
function drawScene(camX) {
  background('#e3d5ca');                   // 背景顏色 e3d5ca
  noStroke();                              // 不畫外框
  // 遠處的雲（移動較慢，產生景深）
  fill(255, 255, 255, 170);                // 半透明白色
  for (let i = 0; i < 9; i++) {            // 畫 9 朵雲
    let cx = i * 450 - camX * 0.3;         // 雲的 x（乘 0.3 讓它移動得比較慢）
    let cy = 100 + (i % 3) * 50;           // 雲的高度錯開
    ellipse(cx, cy, 160, 50);              // 雲的主體
    ellipse(cx + 40, cy - 20, 100, 50);    // 雲的右上突起
    ellipse(cx - 40, cy - 10, 90, 40);     // 雲的左上突起
  }
  // 遠處的山丘（移動速度中等）
  fill('#cdb4a2');                         // 山丘顏色
  for (let i = 0; i < 7; i++) {            // 畫 7 座山丘
    ellipse(i * 700 - camX * 0.5, groundY, 600, 260); // 一半會被地面蓋住
  }
  // 地面
  fill('#b08968');                         // 地面顏色
  rect(0, groundY, width, height - groundY); // 從腳底位置一直畫到畫面底部
  fill('#8d6e4f');                         // 地面上緣的深色線條
  rect(0, groundY, width, 8);              // 地面上緣
  stroke('#9c7a58');                       // 地面上的小虛線顏色
  strokeWeight(3);                         // 線條粗細
  for (let gx = -(camX % 80); gx < width; gx += 80) { // 每 80 像素畫一小段，並隨鏡頭移動
    line(gx, groundY + 40, gx + 30, groundY + 40);    // 一小段地面紋路
  }
  noStroke();                              // 取消外框

  // 壘包
  textAlign(CENTER, CENTER);               // 文字置中
  for (let b of bases) {                   // 逐一畫每個壘包
    let sx = b.x - camX;                   // 轉成畫面上的 x
    if (sx < -100 || sx > width + 100) continue; // 在畫面外就不用畫
    fill(b.done ? '#7bc67b' : '#ffffff');  // 完成變綠色，未完成是白色
    stroke('#6d4c41');                     // 外框顏色
    strokeWeight(3);                       // 外框粗細
    rect(sx - 45, groundY - 12, 90, 16, 5); // 壘包本體
    noStroke();                            // 取消外框
    fill('#5d4037');                       // 文字顏色
    textSize(22);                          // 文字大小
    text(b.label, sx, groundY - 34);       // 壘包名稱
    // 靠近還沒完成的壘包時，提示可以按 ↓ 滑壘
    if (!b.done && abs(x - b.x) < 700 && showHints) {
      let bob = sin(frameCount * 0.15) * 5;     // 上下晃動的幅度
      fill('#e76f51');                          // 提示文字顏色
      textSize(18);                             // 提示文字大小
      text('↓ 滑到這裡！', sx, groundY - 70 + bob); // 提示文字
    }
  }

  // 棒球
  for (let i = 0; i < coins.length; i++) { // 逐一畫每顆棒球
    let c = coins[i];                      // 取出這顆棒球
    if (c.taken) continue;                 // 已撿走的不畫
    let sx = c.x - camX;                   // 轉成畫面上的 x
    if (sx < -50 || sx > width + 50) continue; // 在畫面外就不用畫
    let sy = groundY - c.h + sin(frameCount * 0.1 + i) * 6; // y 座標加上上下浮動
    fill(255);                             // 棒球白色
    stroke(120);                           // 灰色外框
    strokeWeight(2);                       // 外框粗細
    ellipse(sx, sy, COIN_R * 2, COIN_R * 2); // 球體
    noFill();                              // 縫線不填色
    stroke('#d62828');                     // 縫線紅色
    arc(sx - 14, sy, 26, 36, -1.1, 1.1);   // 左邊縫線
    arc(sx + 14, sy, 26, 36, PI - 1.1, PI + 1.1); // 右邊縫線
    noStroke();                            // 取消外框
  }
}

// drawParticles() 畫出所有粒子
function drawParticles(camX) {
  noStroke();                                     // 不畫外框
  for (let p of particles) {                      // 逐一畫每顆粒子
    fill(p.c[0], p.c[1], p.c[2], p.life * 8);     // 壽命越短越透明
    ellipse(p.x - camX, p.y, p.size, p.size);     // 畫圓（世界座標轉畫面座標）
  }
}

// drawPopups() 畫出飄起來的文字
function drawPopups(camX) {
  textAlign(CENTER, CENTER);                      // 文字置中
  textSize(28);                                   // 文字大小
  for (let t of popups) {                         // 逐一畫每段文字
    let rise = (60 - t.life) * 1.2;               // 越老飄得越高
    fill(60, 40, 30, t.life * 5);                 // 越老越透明
    text(t.txt, t.x - camX, t.y - rise);          // 畫出文字
  }
}

// keyCap() 畫一個小小的鍵盤按鍵圖示；按下時會變橘色
function keyCap(label, kx, ky, kw, pressed) {
  push();                                         // 儲存繪圖設定，避免按鍵的置中設定影響後面的說明文字
  stroke('#6d4c41');                              // 按鍵外框顏色
  strokeWeight(2);                                // 外框粗細
  fill(pressed ? '#f4a261' : '#ffffff');          // 按下時橘色，沒按時白色
  rect(kx, ky, kw, 30, 6);                        // 按鍵本體
  noStroke();                                     // 取消外框
  fill('#3e2723');                                // 按鍵文字顏色
  textAlign(CENTER, CENTER);                      // 文字置中
  textSize(15);                                   // 按鍵文字大小
  text(label, kx + kw / 2, ky + 15);              // 把文字畫在按鍵中央
  pop();                                          // 還原繪圖設定（文字回到靠左對齊）
}

// drawHUD() 畫分數與操作提示
function drawHUD() {
  // ----- 右上角：分數與進度 -----
  let doneCount = bases.filter(b => b.done).length;     // 已完成的壘包數
  let coinCount = coins.filter(c => c.taken).length;    // 已撿到的棒球數
  noStroke();                                           // 不畫外框
  fill(255, 255, 255, 200);                             // 半透明白色底
  rect(width - 216, 16, 200, 84, 12);                   // 分數面板
  fill('#3e2723');                                      // 文字顏色
  textAlign(LEFT, CENTER);                              // 文字靠左
  textSize(18);                                         // 文字大小
  text('得分：' + score, width - 200, 36);              // 顯示分數
  text('壘包：' + doneCount + ' / ' + bases.length, width - 200, 62); // 顯示壘包進度
  text('棒球：' + coinCount + ' / ' + coins.length, width - 200, 88 - 2); // 顯示棒球進度

  // ----- 全部壘包完成：顯示過關訊息 -----
  if (doneCount === bases.length) {                     // 4 個壘包都完成了
    fill(255, 255, 255, 220);                           // 半透明白色底
    rect(width / 2 - 200, 120, 400, 90, 16);            // 訊息面板
    fill('#e76f51');                                    // 文字顏色
    textAlign(CENTER, CENTER);                          // 文字置中
    textSize(32);                                       // 標題大小
    text('全壘打！', width / 2, 150);                   // 標題
    textSize(16);                                       // 說明文字大小
    fill('#3e2723');                                    // 說明文字顏色
    text('按 R 重新開始', width / 2, 188);              // 說明
  }

  // ----- 左上角：操作提示 -----
  if (!showHints) {                                     // 如果提示被隱藏
    fill('#3e2723');                                    // 文字顏色
    textAlign(LEFT, CENTER);                            // 文字靠左
    textSize(14);                                       // 文字大小
    text('按 H 顯示操作提示', 20, 28);                  // 只顯示一行小提醒
    return;                                             // 不畫下面的面板
  }
  let px = 16, py = 16, rowH = 44;                      // 面板位置與每列高度
  noStroke();                                           // 不畫外框
  fill(255, 255, 255, 200);                             // 半透明白色底
  rect(px, py, 330, rowH * 5 + 16, 12);                 // 提示面板
  textAlign(LEFT, CENTER);                              // 文字靠左
  textSize(15);                                         // 說明文字大小
  let y0 = py + 8;                                      // 第一列的上緣
  // 第 1 列：左右移動
  keyCap('←', px + 14, y0 + 7, 34, keyIsDown(LEFT_ARROW));   // ← 按鍵
  keyCap('→', px + 54, y0 + 7, 34, keyIsDown(RIGHT_ARROW));  // → 按鍵
  fill('#3e2723'); noStroke();                          // 文字顏色
  text('左右移動', px + 102, y0 + 22);                  // 說明
  // 第 2 列：加速跑
  keyCap('Shift', px + 14, y0 + rowH + 7, 64, keyIsDown(SHIFT)); // Shift 按鍵
  fill('#3e2723'); noStroke();                          // 文字顏色
  text('+ 方向鍵：加速跑', px + 90, y0 + rowH + 22);    // 說明
  // 第 3 列：跳躍與二段跳
  keyCap('空白', px + 14, y0 + rowH * 2 + 7, 52, keyIsDown(32));          // 空白鍵
  keyCap('↑', px + 72, y0 + rowH * 2 + 7, 34, keyIsDown(UP_ARROW));       // ↑ 按鍵
  fill('#3e2723'); noStroke();                          // 文字顏色
  text('跳！空中再按＝二段跳', px + 114, y0 + rowH * 2 + 22); // 說明
  // 第 4 列：滑壘
  keyCap('↓', px + 14, y0 + rowH * 3 + 7, 34, keyIsDown(DOWN_ARROW));     // ↓ 按鍵
  fill('#3e2723'); noStroke();                          // 文字顏色
  text('滑壘：停在壘包上得分', px + 60, y0 + rowH * 3 + 22); // 說明
  // 第 5 列：提示開關與重來
  keyCap('H', px + 14, y0 + rowH * 4 + 7, 34, false);   // H 按鍵
  keyCap('R', px + 54, y0 + rowH * 4 + 7, 34, false);   // R 按鍵
  fill('#3e2723'); noStroke();                          // 文字顏色
  text('提示開關 / 重新開始', px + 102, y0 + rowH * 4 + 22); // 說明
}

// 當瀏覽器視窗大小改變時，自動調整畫布大小
function windowResized() {
  resizeCanvas(windowWidth, windowHeight); // 重新設定畫布為新的視窗大小
  groundY = height - GROUND_MARGIN;        // 重新計算地面高度
  if (y > groundY) y = groundY;            // 避免角色卡在地面以下
}