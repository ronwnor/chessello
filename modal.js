const modal = $`dialog`;
const modalTitle = $`dialog div`;
const [modalToggleWhite, modalToggleBlack] = $`dialog .toggle`.children;
const modalButton = $`dialog button`;
// const [blackClockEl, whiteClockEl] = $$('.clock');

const score = Vec.new(0, 0);


// removeEventListener('touchend', handleTouchend);
modal.showModal();

modalToggleWhite.onclick = () => {
    modalToggleWhite.classList.add("selected");
    modalToggleBlack.classList.remove("selected");

    whiteClockEl.classList.add("active");
    blackClockEl.classList.remove("active");

}
modalToggleBlack.onclick = () => {
    modalToggleBlack.classList.add("selected");
    modalToggleWhite.classList.remove("selected");

    whiteClockEl.classList.remove("active");
    blackClockEl.classList.add("active");
}

modalButton.onclick = () => {
    timeFormat.x = +$('select').value.split('|')[0] * 60000;
    timeFormat.y = +$('select').value.split('|')[1] * 1000;
    turn = modalToggleWhite.classList.contains('selected') ? 1 : 2;
    cells = [
        1,1,1,1,1,1,1,1,
        0,0,0,0,0,0,0,0,
        0,0,0,0,0,0,0,0,
        0,0,0,3,4,0,0,0,
        0,0,0,4,3,0,0,0,
        0,0,0,0,0,0,0,0,
        0,0,0,0,0,0,0,0,
        2,2,2,2,2,2,2,2,
    ];
    candidates = [];
    dragged && (dragged.style.backgroundSize = 'cover');
    selected = dragged = undefined;
    dragEl.style.backgroundImage = '';
    updateDisplay();

    if(timeFormat.x == Infinity){
        $$('.clock').forEach(e => e.classList.add('hidden'));
    } else {
        $$('.clock').forEach(e => e.classList.remove('hidden'));
    }
    timeLeft.x = timeFormat.x;
    timeLeft.y = timeFormat.x;
    updateClockDisplay();


    modal.close(); 
    // addEventListener('touchend', handleTouchend);
}

function showEndModal(side, reason){
    
    // removeEventListener('touchend', handleTouchend);

    score[side == 'White' ? 'x' : 'y']++;
    hasGameStarted = false;

    modalTitle.innerHTML = `${score.x} - ${score.y}<br/>${side} wins<div>by ${reason}</div>`;
    modalButton.innerText = 'New Game';
    modal.showModal();
}
