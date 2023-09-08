const $  = document.querySelector.bind(document);
const $$ = document.querySelectorAll.bind(document);
const {floor, abs, max} = Math;
const mod = (n, k) => n - k*floor(n/k); 
const isModalShowing = false;

class Vec {
    constructor(x,y){
        this.x = x;
        this.y = y;
    }

    static new(x,y){
        return new Vec(x,y);
    }

    static fromIdx(n){
        return new Vec(n%8, floor(n/8));
    }

    static directions = [
        new Vec(-1, -1),
        new Vec( 0, -1),
        new Vec( 1, -1),
        new Vec(-1,  1),
        new Vec( 0,  1),
        new Vec( 1,  1),
        new Vec(-1,  0),
        new Vec( 1,  0),
    ]

    toIdx(){
        return this.x + this.y * 8;
    }

    get index(){
        return this.toIdx();
    }

    add(vecOrX, y){
        if(typeof y == 'number'){
            return new Vec(this.x + vecOrX, this.y + y);
        }
        return new Vec(this.x + vecOrX.x, this.y + vecOrX.y);
    }

    mul(s){
        return new Vec(this.x * s, this.y * s);
    }
}

// initialize board state
// 0 = empty; 1 = white pawn; 2 = black pawn; 3 = white disk; 4 = black disk;
let cells = [
    1,1,1,1,1,1,1,1,
    0,0,0,0,0,0,0,0,
    0,0,0,0,0,0,0,0,
    0,0,0,3,4,0,0,0,
    0,0,0,4,3,0,0,0,
    0,0,0,0,0,0,0,0,
    0,0,0,0,0,0,0,0,
    2,2,2,2,2,2,2,2,
];
let turn = 1;
let candidates = [];
let selected, dragged;
const timeFormat = Vec.new(NaN, NaN);
const timeLeft = Vec.new(NaN, NaN);
let hasGameStarted = false;

const boardEl = $`.board`;
const dragEl = $`#follow-mouse`;
const [blackDiskEl, whiteDiskEl] = $`.disks`.children;
const [blackClockEl, whiteClockEl] = $$('.clock');


// initialize tiles
for(let i=0; i<64; i++){
    let tile = document.createElement('div');
    tile.id = 'tile'+(i%8 + 56 - 8*floor(i/8));
    tile.className = 'tile ' +  ((floor(i/8) + i)%2 ? 'light ' : 'dark ');
    tile.onmousedown = handleTileMouseDown;
    tile.onmouseup   = handleTileMouseUp;

    tile.ontouchstart = (e) => {
        e.preventDefault(); 
        handleTileMouseDown(e.touches[0]); 
    }
    tile.ontouchend = (e) => { 
        e.preventDefault();
        let target = document.elementFromPoint(32+ +dragEl.style.left.slice(0,-2), 32+ +dragEl.style.top.slice(0,-2));
        if(target.classList.contains('tile')){
            handleTileMouseUp({target});
        } 
    }
    boardEl.appendChild(tile);
}

whiteDiskEl.onmousedown = handleWhiteDiskMouseDown;
blackDiskEl.onmousedown = handleBlackDiskMouseDown;
whiteDiskEl.onmouseup = blackDiskEl.onmouseup = handleDiskMouseUp;

whiteDiskEl.ontouchstart = (e) => {
    e.preventDefault();
    handleWhiteDiskMouseDown();
}
blackDiskEl.ontouchstart = (e) => {
    e.preventDefault();
    handleBlackDiskMouseDown();
}

whiteDiskEl.ontouchend = blackDiskEl.ontouchend = (e) => {
    e.preventDefault();
    let target = document.elementFromPoint(32+ +dragEl.style.left.slice(0,-2), 32+ +dragEl.style.top.slice(0,-2));
    if(target.classList.contains('tile')){
        handleTileMouseUp({target});
    } 
}


addEventListener('mousemove', (e) => { 
    dragEl.style.left = e.x - 32 + 'px'; 
    dragEl.style.top  = e.y - 32 + 'px';
}, {passive: false});

addEventListener('touchmove', (e) => { 
    e.preventDefault();
    e = e.touches[0];
    dragEl.style.left = e.clientX - 32 + 'px'; 
    dragEl.style.top  = e.clientY - 32 + 'px';
    console.log('move:', e.clientX, e.clientY, document.elementFromPoint(e.clientX, e.clientY));
}, {passive: false});

onmouseup = (e) => {
    if(e.target.tagName != 'BODY' && !e.target.classList.contains('disks')) return;
    dragEl.style.backgroundImage = '';
    dragged && (dragged.style.backgroundSize = 'cover');
    boardEl.childNodes.forEach(e => e.classList.remove('mid-drag'));
    dragged = undefined;
    selected = undefined;
    candidates = [];
    updateDisplay();
}
// handleTouchend = (e) => {
//     // e.preventDefault();
//     onmouseup(e.touches[0]);
// }

document.body.onclick = (e) => { if(e.target.tagName == 'BODY'){selected = undefined; candidates = []; updateDisplay(); }}


let t0 = 0;
(function clockHandler(t){

    let dt = t - t0;
    t0 = t;

    if(hasGameStarted){
        timeLeft[turn == 1 ? 'x' : 'y'] -= dt;
        updateClockDisplay();
    }

    requestAnimationFrame(clockHandler);
})();

function formatTime(t){

    t = max(t, 0);

    const min = ('0'+(mod(t/60000, 60)|0)).slice(-2);
    const sec = ('0'+(mod(t/1000 , 60)|0)).slice(-2);
    const ms  = ('0'+(mod(t/10   ,100)|0)).slice(-2);
    
    let str =  min + ':' + sec + (!+min && +sec < 20 ? ':' + ('0'+ms).slice(-2) : '');

    return str;
}

function updateClockDisplay(){
    tWhite = timeLeft.x;
    tBlack = timeLeft.y;
    whiteClockEl.innerText = formatTime(tWhite);
    blackClockEl.innerText = formatTime(tBlack);

    if(tWhite < 0){
        showEndModal('Black', 'Timeout');
    } else if(tBlack < 0){
        showEndModal('White', 'Timeout');
    }


}

function updateDisplay(){
    for(let i=0; i<64; i++){
        let tile = $('#tile' + i);
        
        tile.classList.remove('black', 'white', 'disk', 'pawn', 'selected', 'candidate');
        
        if(i == selected) 
            tile.classList.add('selected');
        else if(candidates.includes(i))
            tile.classList.add('candidate');
        
        switch(cells[i]){
            case 1: tile.classList.add('white', 'pawn'); break;
            case 2: tile.classList.add('black', 'pawn'); break;
            case 3: tile.classList.add('white', 'disk'); break;
            case 4: tile.classList.add('black', 'disk'); break;
        }
    }
}

updateDisplay();

function canPawnMoveTo(pawnIdx, targetIdx){
    let targetPos = Vec.fromIdx(targetIdx);
    let pawnPos = Vec.fromIdx(pawnIdx);

    if(cells[targetIdx] == cells[pawnIdx] || cells[targetIdx] == cells[pawnIdx] + 2){ // trying to stomp an alley piece
        return false;
    }

    let pawnType = cells[pawnIdx];

    if(targetPos.x == pawnPos.x && cells[targetIdx] == 0){
        if(pawnType == 1 && targetPos.y == pawnPos.y + 1){
            return true;
        }
        if(pawnType == 2 && targetPos.y == pawnPos.y - 1){
            return true
        }
        if(pawnType == 1 && pawnPos.y == 0 && targetPos.y == 2 && cells[pawnPos.add(0,1).index] == 0){
            return true;
        }
        if(pawnType == 2 && pawnPos.y == 7 && targetPos.y == 5 && cells[pawnPos.add(0,-1).index] == 0){
            return true;
        }
        
    } else if(abs(targetPos.x - pawnPos.x) == 1){
        if(pawnType == 1 && targetPos.y == pawnPos.y + 1 && (cells[targetIdx] == 2 || cells[targetIdx] == 4)){
            return true;
        }
        if(pawnType == 2 && targetPos.y == pawnPos.y - 1 &&(cells[targetIdx] == 1 || cells[targetIdx] == 3)){
            return true;
        }
    }

    return false;
}

function canPutDiskAt(targetIdx, diskType){

    if(cells[targetIdx]){
        return false;
    } 
    
    let targetPos = Vec.fromIdx(targetIdx);
    let oppType = 7 - diskType; // 7-(3) = 4;  7-(4) = 3;

    for(let direction of Vec.directions){
        let flippables = [];
        
        rayLoop:
            for(let i=1; i<8; i++){
                
                let neighbor = targetPos.add(direction.mul(i));
                let neighborType = cells[neighbor.index];

                // out of bounds
                if(neighbor.x < 0 || neighbor.x > 7) break;
                if(neighbor.y < 0 || neighbor.y > 7) break;

                switch(neighborType){
                    case oppType:
                    case oppType - 2:
                        flippables.push(neighborType); break;
                    case diskType:
                    case diskType - 2:
                        if(flippables.includes(oppType)) return true;
                    case 0:
                        break rayLoop;
                    
                }
            }
    }
    return false;
}

function getFlippableDisks(targetIdx, diskType){
    
    let targetPos = Vec.fromIdx(targetIdx);
    let oppType = 7 - diskType; // 7-(3) = 4;  7-(4) = 3;
    let allFlippables = [];


    for(let direction of Vec.directions){
        let flippables = [];
        
        rayLoop:
            for(let i=1; i<8; i++){
                
                let neighbor = targetPos.add(direction.mul(i));
                let neighborType = cells[neighbor.index];

                // out of bounds
                if(neighbor.x < 0 || neighbor.x > 7) break;
                if(neighbor.y < 0 || neighbor.y > 7) break;

                switch(neighborType){
                    case oppType:
                    case oppType - 2:
                        flippables.push({idx: neighbor.index, type: neighborType}); break;
                    case diskType:
                    case diskType - 2: {
                        if(flippables.some(e => e.type == oppType)){
                            let actuallyFlippables = flippables.filter(e => e.type == oppType).map(e => e.idx);
                            allFlippables.push(...actuallyFlippables);
                        };
                        break rayLoop;
                    }
                    case 0:
                        break rayLoop;
                    
                }
            }
    }
    return allFlippables;
}

function endTurn(){

    if(!cells.some(e => e == 3)){
        showEndModal('Black', 'Othello');
    } else if(!cells.some(e => e == 4)){
        showEndModal('White', 'Othello');
    }

    turn = 3 - turn; // 3 - (1) = 2;  3 - (2) = 1;
    hasGameStarted = true;
    timeLeft[turn == 1 ? 'y' : 'x'] += timeFormat.y;
    blackClockEl.classList.toggle('active');
    whiteClockEl.classList.toggle('active');
}

function handleTileMouseUp(e){
    dragEl.style.backgroundImage = '';
    dragged && (dragged.style.backgroundSize = 'cover');
    
    boardEl.childNodes.forEach(e => e.classList.remove('mid-drag'));

    dragged = undefined;

    let target = Number(e.target.id.slice(4));

    if(candidates.includes(target)){
        if(cells?.[selected] != undefined){
            cells[target] = cells[selected];
            cells[selected] = 0;
        } else {
            cells[target] = turn + 2;
        } 

        // also flip disks if there's any 
        for(let i of getFlippableDisks(target, turn + 2)){
            cells[i] = 7 - cells[i]; // 7-(3) = 4;  7-(4) = 3;
        }

        endTurn();

        selected = undefined;
        candidates = [];
        updateDisplay();
    }
}

function handleTileMouseDown(e){
    let target = Number(e.target.id.slice(4));
    
    if(cells[target] == turn){
        dragEl.style.backgroundImage = `var(--${turn == 1 ? 'white' : 'black'}-pawn)`;
        dragged = e.target;
        dragged.style.backgroundSize = '0';
        boardEl.childNodes.forEach(e => e.classList.add('mid-drag'));
        
        selected = target;
        candidates = cells.map((_,i) => i).filter((i) => canPawnMoveTo(selected, i));
        
        // console.log(selected, candidates);
    } else {

        if(candidates.includes(target)){
            if(cells?.[selected] != undefined){
                cells[target] = cells[selected];
                cells[selected] = 0;
            } else {
                cells[target] = turn + 2;
            } 

            // also flip disks if there's any 
            for(let i of getFlippableDisks(target, turn + 2)){
                cells[i] = 7 - cells[i]; // 7-(3) = 4;  7-(4) = 3;
            }

            endTurn();
        }


        selected = undefined;
        candidates = [];
    }
    updateDisplay();
}
function handleTileClick(e){
    let target = Number(e.target.id.slice(4));
    
    if(cells[target] == turn){

        selected = target;
        candidates = cells.map((_,i) => i).filter((i) => canPawnMoveTo(selected, i));
        
        console.log(selected, candidates);
    } else {

        if(candidates.includes(target)){
            if(cells?.[selected] != undefined){
                cells[target] = cells[selected];
                cells[selected] = 0;
            } else {
                cells[target] = turn + 2;
            } 

            // also flip disks if there's any 
            for(let i of getFlippableDisks(target, turn + 2)){
                cells[i] = 7 - cells[i]; // 7-(3) = 4;  7-(4) = 3;
            }

            endTurn();

        }


        selected = undefined;
        candidates = [];
    }
    updateDisplay();
}
function handleWhiteDiskMouseDown(){
    if(turn == 1){
        dragEl.style.backgroundImage = `var(--white-disk)`;
        boardEl.childNodes.forEach(e => e.classList.add('mid-drag'));
        selected = -1;
        candidates = [];
        for(let i=0; i<64; i++){
            if(canPutDiskAt(i, turn + 2)){
                candidates.push(i);
            }
        }
        updateDisplay();
    }
}
function handleBlackDiskMouseDown(){
    if(turn == 2){
        dragEl.style.backgroundImage = `var(--black-disk)`;
        boardEl.childNodes.forEach(e => e.classList.add('mid-drag'));
        selected = -2;
        candidates = [];
        for(let i=0; i<64; i++){
            if(canPutDiskAt(i, turn + 2)){
                candidates.push(i);
            }
        }
        updateDisplay();
    }
}
function handleDiskMouseUp(){
    dragEl.style.backgroundImage = '';
    dragged && (dragged.style.backgroundSize = 'cover');
    boardEl.childNodes.forEach(e => e.classList.remove('mid-drag'));
    dragged = undefined;
}

// for mobile
if(innerWidth / innerHeight <= 8/10){
    $('.disks').removeChild(whiteDiskEl);
    $('.mobile-only').appendChild(whiteDiskEl);
    
    $('.container').removeChild(blackClockEl);
    $('.container').removeChild(whiteClockEl);

    $('.disks').appendChild(blackClockEl);
    $('.mobile-only').appendChild(whiteClockEl);
}
