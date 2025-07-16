import gsap from "gsap";
import { CustomEase } from "gsap/all";
import SplitType from "split-type";
import items from "./item";

gsap.registerPlugin(CustomEase);
CustomEase.create("hop", "0.9, 0, 0.1, 1");

//KeyDom Elements
const container = document.querySelector(".container");
const canvas = document.querySelector(".canvas");
const overlay = document.querySelector(".overlay");
const projectTitleElement = document.querySelector(".project-title p");

//Layout Constants
const itemCount = 20;
const itemGap = 150;
const columns = 4;
const itemWidth = 120;
const itemHeight = 160;

//Dynamic and reactive Interface
let isDragging = false;
let startX, startY;
let targetX = 0,
  targetY = 0;
let currentX = 0,
  currentY = 0;
let dragVelocityX = 0,
  dragVelocityY = 0;
let lastDragTime = 0;
let mouseHasMoved = false;
let visibleItems = new Set();
let lastUpdateTime = 0;
let lastX = 0,
  lastY = 0;
let isExpanded = false;
let activeItem = null;
let canDrag = true;
let orginialPosition = null;
let expandedItem = null;
let activeItemId = null;
let titleSplit = null;

//animate title
function setAndAnimateTitle(title) {
  if (titleSplit) titleSplit.revert();
  projectTitleElement.textContent = title;
  titleSplit = new SplitType(projectTitleElement, { types: "words" });
  gsap.set(titleSplit.words, { y: "100%" });
}

//animate words
function animateTitleIn() {
  gsap.to(titleSplit.words, {
    y: "0%",
    duration: 1,
    stagger: 0.1,
    ease: "power3.out",
  });
}

//project title animate in and out as user interact with items
function animateTitleOut() {
  gsap.to(titleSplit.words, {
    y: "-100%",
    duration: 1,
    stagger: 0.1,
    ease: "power3.out",
  });
}

//Items are visible on the screen
function updateVisibleItems() {
  const buffer = 2.5;
  const viewWidth = window.innerWidth * (1 + buffer);
  const viewHeight = window.innerHeight * (1 + buffer);
  const movingRight = targetX > currentX;
  const movingDown = targetY > currentY;
  const directionBufferX = movingRight ? -300 : 300;
  const directionBufferY = movingDown ? -300 : 300;

  const startCol = Math.floor(
    (-currentX - viewWidth / 2 + (movingRight ? directionBufferX : 0)) /
      (itemWidth + itemGap)
  );

  const endCol = Math.ceil(
    (-currentX + viewWidth * 1.5 + (!movingRight ? directionBufferX : 0)) /
      (itemWidth + itemGap)
  );

  const startRow = Math.floor(
    (-currentY - viewHeight / 2 + (movingDown ? directionBufferY : 0)) /
      (itemHeight + itemGap)
  );

  const endRow = Math.ceil(
    (-currentY + viewHeight * 1.5 + (!movingDown ? directionBufferY : 0)) /
      (itemHeight + itemGap)
  );

  const currentItems = new Set();
  for (let row = startRow; row <= endRow; row++) {
    for (let col = startCol; col <= endCol; col++) {
      const itemId = `${col}, ${row}`;
      currentItems.add(itemId);

      if (visibleItems.has(itemId)) continue;
      if (activeItemId === itemId && isExpanded) continue;

      const item = document.createElement("div");
      item.className = "item";
      item.id = itemId;
      item.style.left = `${col * (itemWidth + itemGap)}px`;
      item.style.top = `${row * (itemHeight + itemGap)}px`;
      item.dataset.col = col;
      item.dataset.row = row;

      const itemNum = (Math.abs(row * columns + col) % itemCount) + 1;
      const img = document.createElement("img");
      img.src = `/img${itemNum}.jpg`;
      img.alt = `Image ${itemNum}`;
      item.appendChild(img);

      item.addEventListener("click", (e) => {
        if (mouseHasMoved || isDragging) return;
        handleItemClick(item);
      });

      canvas.appendChild(item);
      visibleItems.add(itemId);
    }
  }

  visibleItems.forEach((itemId) => {
    if (!currentItems.has(itemId) || (activeItemId === itemId && isExpanded)) {
      const item = document.getElementById(itemId);
      if (item) canvas.removeChild(item);
      visibleItems.delete(itemId);
    }
  });
}

function handleItemClick(item) {
  if (isExpanded) {
    if (expandedItem) closeExpandedItem();
  } else {
    expandItem(item);
  }
}

function expandItem(item) {
  isExpanded = true;
  activeItem = item;
  activeItemId = item.id;
  canDrag = false;
  container.style.cursor = "auto";

  const imgSrc = item.querySelector("img").src; 
  console.log(imgSrc)
  const imgMatch = imgSrc.match(/\/img(\d+)\.jpg/);
  const imgNum = imgMatch ? parseInt(imgMatch[1]) : 1;
  const titleIndex = (imgNum - 1) % items.length;

  setAndAnimateTitle(items[titleIndex]);
  item.style.visibility = "hidden";

  const rect = item.getBoundingClientRect();
  const targetImg = item.querySelector("img").src;

  orginialPosition = {
    id: item.id,
    rect: rect,
    imgSrc: targetImg,
  };

  overlay.classList.add("active");

  expandedItem = document.createElement("div");
  expandedItem.className = "expanded-item";
  expandedItem.style.width = `${itemWidth}px`;
  expandedItem.style.height = `${itemHeight}px`;

  const img = document.createElement("img");
  img.src = targetImg;
  expandedItem.appendChild(img);
  expandedItem.addEventListener("click", closeExpandedItem);
  document.body.appendChild(expandedItem);

  document.querySelectorAll(".item").forEach((el) => {
    if (el !== activeItem) {
      gsap.to(el, {
        opacity: 0,
        duration: 0.3,
        ease: "power2.out",
      });
    }
  });

  const viewportWidth = window.innerWidth;
  const targetWidth = viewportWidth * 0.4;
  const targetHeight = targetWidth * 1.2;

  gsap.delayedCall(0.5, animateTitleIn);

  gsap.fromTo(
    expandedItem,
    {
      width: itemWidth,
      height: itemHeight,
      x: rect.left + itemWidth / 2 - window.innerWidth / 2,
      y: rect.top + itemHeight / 2 - window.innerHeight / 2,
    },
    {
      width: targetWidth,
      height: targetHeight,
      x: 0,
      y: 0,
      duration: 1,
      ease: "hop",
    }
  );
}

function closeExpandedItem() {
  if (!expandItem || !orginialPosition) return;

  animateTitleOut();
  overlay.classList.remove("active");
  const orginialRect = orginialPosition.rect;

  document.querySelectorAll(".item").forEach((el) => {
    if (el !== activeItemId) {
      gsap.to(el, {
        opacity: 1,
        duration: 0.5,
        delay: 0.5,
        ease: "power2.out",
      });
    }
  });

  const originalItem = document.getElementById(activeItemId);

  gsap.to(expandedItem, {
    width: itemWidth,
    height: itemHeight,
    x: orginialRect.left + itemWidth / 2 - window.innerWidth / 2,
    y: orginialRect.top + itemHeight / 2 - window.innerHeight / 2,
    duration: 1,
    ease: "hop",
    onComplete: ()=>{
        if(expandedItem && expandedItem.parentNode){
            document.body.removeChild(expandedItem);
        }

        if(originalItem){
          originalItem.style.visibility = "visible";
        }

        expandedItem = null;
        isExpanded = false;
        activeItem = null;
        orginialPosition = null;
        activeItemId = null;
        canDrag = true;
        container.style.cursor = "grab";
        dragVelocityX = 0;
        dragVelocityY = 0;

    }
  });
}

function animate(){
  if(canDrag){
    const ease = 0.075;
    currentX += (targetX - currentX) * ease;
    currentY += (targetY - currentY) * ease;

    canvas.style.transform = `translate(${currentX}px, ${currentY}px)`;

    const now = Date.now();
    const distMoved = Math.sqrt(
      Math.pow(currentX - lastX, 2) + Math.pow(currentY - lastY, 2)
    );

    if( distMoved > 100 || now - lastUpdateTime > 120){
      updateVisibleItems();
      lastX = currentX;
      lastY = currentY;
      lastUpdateTime = now;
    }
  }

  requestAnimationFrame(animate);
}

container.addEventListener("mousedown", (e)=>{
  if(!canDrag) return;
  isDragging = true;
  mouseHasMoved = false;
  startX = e.clientX;
  startY = e.clientY;
  container.style.cursor = "grabbing";
});

window.addEventListener("mousemove", (e)=>{
  if(!isDragging || !canDrag) return;

  const dx = e.clientX - startX;
  const dy = e.clientY - startY;

  if(Math.abs(dx) > 5 || Math.abs(dy) > 5){
    mouseHasMoved = true;
  }

  const now = Date.now();
  const dt = Math.max(10, now - lastDragTime);
  lastDragTime =  now;

  dragVelocityX = dx / dt;
  dragVelocityY = dy / dt;

  targetX += dx;
  targetY += dy;

  startX = e.clientX;
  startY = e.clientY;

});

window.addEventListener("mouseup", (e)=>{
  if(!isDragging) return;
  isDragging = false;

  if(canDrag){
    container.style.cursor  = "grab";

    if(Math.abs(dragVelocityX) > 0.1 || Math.abs(dragVelocityY) > 0.1){
      const momentumFactor = 200;
      targetX += dragVelocityX * momentumFactor;
      targetY += dragVelocityY * momentumFactor;
    }
  }
});

overlay.addEventListener("click", ()=>{
  if(isExpanded) closeExpandedItem();
});

container.addEventListener("touchstart", (e)=>{
  if(!canDrag) return;
  isDragging = true;
  mouseHasMoved = false;
  startX = e.touches[0].clientX;
  startY = e.touches[0].clientY;

});

window.addEventListener("touchmove", (e)=>{
  if (!isDragging || !canDrag) return;

  const dx = e.touches[0].clientX;
  const dy = e.touches[0].clientY;

  if(Math.abs(dx) > 5 || Math.abs(dy) > 5){
    mouseHasMoved = true;
  }

  targetX += dx;
  targetY += dy;
  
  startX = e.touches[0].clientX;
  startY = e.touches[0].clientY;
});

window.addEventListener("touchend", () =>{
  isDragging = false;
})

window.addEventListener("resize", ()=>{
  if(isExpanded && expandedItem){
    const viewportWidth = window.innerWidth;
    const targetWidth = viewportWidth * 0.4;
    const targetHeight = targetWidth * 1.2;

    gsap.to(expandedItem,{
      width: targetWidth,
      height: targetHeight,
      duration: 0.3,
      ease: "power2.out"
    });
  } else{
    updateVisibleItems();
  }
})

updateVisibleItems();
animate();
