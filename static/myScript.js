let isWhiteTurn = true;
let selectedPawn = null;
let selectedRook = null;
let selectedBishop = null;
let selectedKnight = null;
let selectedQueen = null;
let selectedKing = null;
let aiTurns = 1;
async function updateResult(result) {
  try {
    const response = await fetch('https://chess-game-fbg1.onrender.com/update_result',{
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      credentials: 'include',
      body: JSON.stringify({ result })
    });

    const data = await response.json();
    if (response.ok) {
      console.log('Stats updated:', data);
      //update UI with new values
      document.getElementById('wins-count').textContent = data.wins;
      document.getElementById('losses-count').textContent = data.losses;
    } else {
      console.warn('Failed to update result:', data.error);
    }
  }catch(err) {
     console.error('Error updating result:', err);
  }
}

async function handleLogin() {
    const username = document.getElementById("login-username").value;
    const password = document.getElementById("login-password").value;
    const response = await fetch("https://chess-game-fbg1.onrender.com/login", {
        method:"POST",
        headers:{ "Content-Type": "application/json" },
        credentials:"include",
        body: JSON.stringify({ username, password })
    });

    const data = await response.json();
    if(response.ok) {
        document.getElementById("login-screen").style.display = "none";
        showScreen('main-menu'); //show the game menu after login
        loadUserStats();
        fetchStats();
    }else{
        document.getElementById("login-error").textContent = data.error;
    }
}

async function handleRegister() {
    const username = document.getElementById("register-username").value;
    const password = document.getElementById("register-password").value;
    const response = await fetch("https://chess-game-fbg1.onrender.com/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password })
    });

    const data = await response.json();
    if (response.ok) {
        showScreen('login-screen'); // switch back to login screen
    } else {
        document.getElementById("register-error").textContent = data.error;
    }
}
    function resetSelection() {
        selectedPawn = null;
        selectedRook = null;
        selectedBishop = null;
        selectedKnight = null;
        selectedQueen = null;
        selectedKing = null;
    } 
    function generateFENFromBoard() {
        let fen = '';
        for (let row = 0; row < 8; row++) {
            let emptyCount = 0;
            for (let col = 0; col < 8; col++) {
                const square = document.getElementById(`square-${row}-${col}`);
                const piece = square.firstElementChild;
                if (!piece) {
                    emptyCount++;
                    continue;
                }
    
                if (emptyCount > 0) {
                    fen += emptyCount;
                    emptyCount = 0;
                }
    
                const type = piece.getAttribute('data-type').toLowerCase();
                const color = piece.getAttribute('data-color');
                let symbol = '';
    
                if (type.includes('pawn')) symbol = 'p';
                else if (type.includes('rook')) symbol = 'r';
                else if (type.includes('knight')) symbol = 'n';
                else if (type.includes('bishop')) symbol = 'b';
                else if (type.includes('queen')) symbol = 'q';
                else if (type.includes('king')) symbol = 'k';
    
                fen += color === 'white' ? symbol.toUpperCase() : symbol;
            }
            if (emptyCount > 0) fen += emptyCount;
            if (row !== 7) fen += '/';
        }
        fen += isWhiteTurn ? ' w - - 0 1' : ' b - - 0 1'; 
        return fen;
    }
async function getWhiteAIMove(fen) {
    const response = await fetch("https://chess-game-fbg1.onrender.com/get_move", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fen: fen, turn: aiTurns })
    });
    const data = await response.json();
    return data.move||[]; 
}
async function aiMoveIfWhiteTurn() {
    if (!isWhiteTurn) return;
    const fen = generateFENFromBoard();
    console.log("Generated FEN:", fen);
    try {
        let aiMoves = await getWhiteAIMove(fen);
        console.log("AI Moves received:", aiMoves);
        if (typeof aiMoves === "string") {
            aiMoves = [aiMoves];
        }
        for (const move of aiMoves) {
            applyMoveToBoard(move);
            await new Promise(resolve => setTimeout(resolve, 300));
        }
    } catch (error) {
        console.error("Error fetching AI moves:", error);
    }
}
function applyMoveToBoard(uciMove) {
        const from = uciMove.slice(0, 2);
        const to = uciMove.slice(2, 4);
        const fromRow = 8 - parseInt(from[1]);
        const fromCol = from.charCodeAt(0) - 'a'.charCodeAt(0);
        const toRow = 8 - parseInt(to[1]);
        const toCol = to.charCodeAt(0)-'a'.charCodeAt(0);
    
    const fromSquare = document.getElementById(`square-${fromRow}-${fromCol}`);
    const toSquare = document.getElementById(`square-${toRow}-${toCol}`);

    if (!fromSquare || !toSquare) {
    console.error(`Invalid move: Square not found for ${uciMove}`);
    return;
    }
    const piece = fromSquare.firstElementChild;
    if (!piece) {
        console.error(`No piece found at ${fromSquare.id} for AI move ${uciMove}`);
        return;
    }
    if (toSquare.firstElementChild) {
        const captured = toSquare.firstElementChild;
        const capturedType = captured.getAttribute('data-type');
        const capturedColor = captured.getAttribute('data-color');
        if (capturedType === 'Blackking') {
            updateResult("loss");
            reportGameResult('loss');
            showScreen('loss-screen'); //show loss screen if black king is taken
            return;
        }
        toSquare.removeChild(captured);
    }
    fromSquare.removeChild(piece);
    toSquare.appendChild(piece);
    }
function setDifficulty(turn) {
    aiTurns = turn;
    startgame();
}
//Function to update stats on the home screen
function updateStatsDisplay(wins, losses) {
    const userProfile = document.getElementById("user-profile");
    if (userProfile) {
        userProfile.innerHTML = `<p>Wins: ${wins} | Losses: ${losses}</p>`;
    }
}
//Fetch stats from the backend after login
async function fetchStats() {
  try {
    const response = await fetch('https://chess-game-fbg1.onrender.com/get_stats', {
      credentials: 'include'
    });
    const data = await response.json();
    if (response.ok) {
      document.getElementById('wins-count').textContent = data.wins;
      document.getElementById('losses-count').textContent = data.losses;
    } else {
      console.warn('Failed to fetch stats:', data.error);
    }
  } catch (err) {
    console.error('Error fetching stats:', err);
  }
}

function reportGameResult(result) {
    fetch('https://chess-game-fbg1.onrender.com/update_result', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        credentials: 'include',
        body: JSON.stringify({ result: result })
    })
    .then(response => response.json())
    .then(data => {
        if (!data.error) {
            updateStatsDisplay(data.wins, data.losses);
        } else {
            console.error("Failed to update result:", data.error);
        }
    })
    .catch(err => console.error("Error updating result", err));
}



function showScreen(screenId) {
    //hide all screens on start
    document.querySelectorAll('.screen, #main-menu').forEach(screen => {
        screen.style.display = 'none';
    });

    //Show the selected screen
    document.getElementById(screenId).style.display = 'block';

    //show or hide images based on the screenId
    if (screenId === 'main-menu') {
        document.querySelector('#image').style.display = 'block';
        document.querySelector('#image2').style.display = 'block';
    }
     else {
        document.querySelector('#image').style.display = 'none';
        document.querySelector('#image2').style.display = 'none';
    }
}

document.addEventListener('DOMContentLoaded', () => {
    //function to toggle theme
    function toggleTheme() {
        const currentTheme = document.body.getAttribute('data-theme');
        const newTheme = currentTheme === 'light' ? 'dark' : 'light';
        document.body.setAttribute('data-theme', newTheme);
    }
    const themeToggleButton = document.getElementById('theme-toggle');
    if (themeToggleButton) {
        themeToggleButton.addEventListener('click', toggleTheme);
    }
    function createChessboard() {
        const chessboard = document.getElementById('chessboard');
        for (let row = 0; row < 8; row++) {
            for (let col = 0; col < 8; col++) {
                const square = document.createElement('div');
                square.style.position = 'relative';
                square.id = `square-${row}-${col}`;
    
                // Set square color
                if ((row + col) % 2 === 0) {
                    square.style.backgroundColor = '#f4f1ee';
                } else {
                    square.style.backgroundColor = '#000000';
                }
                // Place pieces with appropriate types
                if (row === 1) {
                    createPiece(square, "/static/blackPawn.png", 'black', 'Blackpawn');
                }
                if (row === 6) {
                    createPiece(square, '/static/pawn.png', 'white', 'pawn');
                }
                if(row === 0 && (col === 0 || col === 7)) {
                    createPiece(square, '/static/blackRook.png', 'black', 'Blackrook');
                }
                if(row === 7 && (col === 0 || col === 7)) {
                    createPiece(square, '/static/whiteRook.png', 'white', 'rook');
                }
                if(row === 0 && (col === 1 || col === 6)) {
                    createPiece(square, '/static/blackKnight.png', 'black', 'Blackknight');
                }
                if(row === 7 && (col === 1 || col === 6)) {
                    createPiece(square, '/static/whiteKnight.png', 'white', 'knight');
                }                
                if(row === 0 && (col === 2 || col === 5)) {
                    createPiece(square, '/static/blackBishop.png', 'black', 'Blackbishop');
                }
                if(row === 7 && (col === 2 || col === 5)) {
                    createPiece(square, '/static/whiteBishop.png', 'white', 'bishop');
                }                
                if(row === 0 && col === 3) {
                    createPiece(square, '/static/blackQueen.png', 'black', 'Blackqueen');
                }
                if(row === 7 && col === 3) {
                    createPiece(square, '/static/whiteQueen.png', 'white', 'queen');
                }                
                if(row === 0 && col === 4) {
                    createPiece(square, '/static/blackKing.png', 'black', 'Blackking');
                }
                if(row === 7 && col === 4) {
                    createPiece(square, '/static/whiteKing.png', 'white', 'king');
                }                
                chessboard.appendChild(square);
                square.addEventListener('click', () => {
                    if (selectedPawn){
                        movePawn(selectedPawn, row, col);
                    }
                });
                square.addEventListener('click', () => {
                    if (selectedRook) {
                        moveRook(selectedRook, row, col);
                    }
                });
                square.addEventListener('click', () => {
                    if (selectedBishop) {
                        moveBishop(selectedBishop, row, col);
                    }
                });
                square.addEventListener('click', () => {
                    if (selectedKnight) {
                        moveKnight(selectedKnight, row, col);
                    }
                });
                square.addEventListener('click', () => {
                    if (selectedQueen) {
                        moveQueen(selectedQueen, row, col);
                    }
                });
                square.addEventListener('click', () => {
                    if (selectedKing) {
                        moveKing(selectedKing, row, col);
                    }
                });
            }
        }
    }
    function createPiece(square, src, color, type) {
        const piece = document.createElement('img');
        piece.src = src;
        piece.style.width = '80%';
        piece.style.height = 'auto';
        piece.style.position = 'absolute';
        piece.style.top = '10%';
        piece.style.left = '10%';
        piece.setAttribute('data-color', color);
        piece.setAttribute('data-type', type);
        piece.addEventListener('click', (event) => {
            event.stopPropagation(); 
            const pieceColor = piece.getAttribute('data-color');
            if (pieceColor === "white") {
                console.log("White piece clicked - Attempting capture!");
                const targetSquare = piece.parentElement; 
                const targetPiece = piece; 
                const attackingPiece = selectedBishop || selectedRook || selectedQueen || selectedPawn || selectedKnight || selectedKing;
                if (attackingPiece) {
                    const success = capturePiece(targetSquare, targetPiece, attackingPiece);
                    if (success) {
                        resetSelection();
                    }
                    return;
                } else {
                    console.log("No attacking piece selected.");
                    return;
                }
            }
            console.log(`Selected ${type} (${color})`);
            resetSelection();
            if (type.includes("pawn")) selectedPawn = piece;
            else if (type.includes("rook")) selectedRook = piece;
            else if (type.includes("bishop")) selectedBishop = piece;
            else if (type.includes("knight")) selectedKnight = piece;
            else if (type.includes("queen")) selectedQueen = piece;
            else if (type.includes("king")) selectedKing = piece;
        });
        square.appendChild(piece);
    }    
    function movePawn(pawn, targetRow, targetCol) {
        const currentSquare = pawn.parentElement;
        const targetSquare = document.getElementById(`square-${targetRow}-${targetCol}`);
        if (targetSquare && targetSquare.children.length === 0) {
            const [currentRow, currentCol] = currentSquare.id.match(/\d+/g).map(Number);
            const isWhitePawn = pawn.getAttribute('data-color') === 'white';
            const direction = isWhitePawn ? 1 : -1;
            if (isValidPawnMove(currentRow, currentCol, targetRow, targetCol, direction)) {
                currentSquare.removeChild(pawn);
                targetSquare.appendChild(pawn);
                isWhiteTurn = true;
                aiMoveIfWhiteTurn();
            } 
        }
        
    }
    function moveRook(rook, targetRow, targetCol) {
        const currentSquare = rook.parentElement;
        const targetSquare = document.getElementById(`square-${targetRow}-${targetCol}`);
        if (targetSquare) {
            const [currentRow, currentCol] = currentSquare.id.match(/\d+/g).map(Number);
            const isWhiteRook = rook.getAttribute('data-color') === 'white';
            const direction = isWhiteRook ? 1 : -1;
            if (isValidRookMove(currentRow, currentCol, targetRow, targetCol)) {
                currentSquare.removeChild(rook);
                targetSquare.appendChild(rook);
                isWhiteTurn = true;
                aiMoveIfWhiteTurn();
            }
        }
    }
    function moveBishop(bishop, targetRow, targetCol) {
        if (!bishop) {
            console.log("No bishop selected!");
            return;
        }
        const currentSquare = bishop.parentElement;
        const targetSquare = document.getElementById(`square-${targetRow}-${targetCol}`);
        const bishopColor = bishop.getAttribute('data-color');
        if (!targetSquare) {
            console.log("Target square not found!");
            return;
        } 
        console.log(`Trying to move bishop from ${currentSquare.id} to ${targetSquare.id}`);
        const [currentRow, currentCol] = currentSquare.id.match(/\d+/g).map(Number);
        if (!isValidBishopMove(currentRow, currentCol, targetRow, targetCol)) {
            console.log("Invalid bishop move!");
            return;
        }
        if (!isPathClearForBishop(currentRow, currentCol, targetRow, targetCol, bishopColor)) {
            console.log("Path is not clear for the bishop!");
            return;
        }
        let targetPiece = targetSquare.firstElementChild;
        if (targetPiece) {
            console.log(`Attempting to capture ${targetPiece.getAttribute('data-type')} at ${targetSquare.id}`);
            if (!capturePiece(targetSquare, targetPiece, bishop)) {
                console.log("Capture failed!");
                return;
            }
        }
        currentSquare.removeChild(bishop);
        targetSquare.appendChild(bishop);
        isWhiteTurn = true;
        aiMoveIfWhiteTurn();
        console.log(`Successfully moved bishop to ${targetRow}, ${targetCol}`);
    
        resetSelection();
    }    
    function capturePiece(targetSquare, targetPiece, movingPiece) {
        if (!targetPiece || !targetSquare) {
            return false;
        }
        const targetColor = targetPiece.getAttribute('data-color');
        const movingColor = movingPiece.getAttribute('data-color');
        if (targetColor === movingColor) {
            return false;
        }
        const attackingType = movingPiece.getAttribute("data-type");
        const [attackingRow, attackingCol] = movingPiece.parentElement.id.match(/\d+/g).map(Number);
        const [targetRow, targetCol] = targetSquare.id.match(/\d+/g).map(Number);
        let ValidCap = false;
        if (attackingType.includes("bishop")&& isValidBishopMove(attackingRow, attackingCol, targetRow, targetCol)) {
            ValidCap = true;
        }
        else if (attackingType.includes("rook")&&isValidRookMove(attackingRow, attackingCol, targetRow, targetCol)) {
            ValidCap = true;
        }
        else if (attackingType.includes("queen")&&isValidQueenMove(attackingRow, attackingCol, targetRow, targetCol)) {
            ValidCap = true;
        }
        else if (attackingType.includes("king")&&isValidKingMove(attackingRow, attackingCol, targetRow, targetCol)) {
            ValidCap = true;
        }
        else if (attackingType.includes("knight")&&isValidKnightMove(attackingRow, attackingCol, targetRow, targetCol)) {
            ValidCap = true;
        }
        else if (attackingType.includes("pawn") && isValidpawnCapture(attackingRow, attackingCol, targetRow, targetCol)) {
            ValidCap = true;
        }
        console.log(`capturePiece() called! Trying to capture ${targetColor} piece.`);
        if (ValidCap) {
            console.log(`Captured ${targetColor} ${targetPiece.getAttribute('data-type')} at ${targetSquare.id}`);
            const isKing = targetPiece.getAttribute('data-type') === 'king';
            const kingColor = targetPiece.getAttribute('data-color');
            if (isKing) {
                if (kingColor === 'white') {
                    reportGameResult('win');
                    updateResult("win");
                    showScreen('win-screen'); //player wins
                }
                return true;
            }
            targetSquare.removeChild(targetPiece);
            targetSquare.appendChild(movingPiece);
            isWhiteTurn = true;
            aiMoveIfWhiteTurn();
            return true;
        }
        return false;
    }
    
    function moveKnight(knight, targetRow, targetCol){
        const currentSquare = knight.parentElement;
        const targetSquare = document.getElementById(`square-${targetRow}-${targetCol}`);
        if(targetSquare){
            const [currentRow, currentCol] = currentSquare.id.match(/\d+/g).map(Number);
            if (isValidKnightMove(currentRow, currentCol, targetRow, targetCol)) {
                currentSquare.removeChild(knight);
                targetSquare.appendChild(knight);
                isWhiteTurn = true;
                aiMoveIfWhiteTurn();
            }
        }    
    }
    function moveQueen(queen,targetRow,targetCol){
        const currentSquare = queen.parentElement;
        const targetSquare = document.getElementById(`square-${targetRow}-${targetCol}`);
        if(targetSquare){
            const [currentRow, currentCol] = currentSquare.id.match(/\d+/g).map(Number);
            if (isValidQueenMove(currentRow, currentCol, targetRow, targetCol)) {
                currentSquare.removeChild(queen);
                targetSquare.appendChild(queen);
                isWhiteTurn = true;
                aiMoveIfWhiteTurn();
            }
        }
    }
    function moveKing(king, targetRow, targetCol){
        const currentSquare = king.parentElement
        const targetSquare =document.getElementById(`square-${targetRow}-${targetCol}`);
        if(targetSquare){
            const [currentRow, currentCol] = currentSquare.id.match(/\d+/g).map(Number);
            if (isValidKingMove(currentRow, currentCol, targetRow, targetCol)) {
                currentSquare.removeChild(king);
                targetSquare.appendChild(king);
                isWhiteTurn = true;
                aiMoveIfWhiteTurn();
            }
        }

    }
    function isValidPawnMove(currentRow, currentCol, targetRow, targetCol, direction) {
        const rowDifference = currentRow - targetRow;
        const colDifference = Math.abs(targetCol - currentCol);
        const isWhitePawn = direction === 1;
        const isBlackPawn = direction === -1;
        //move forward by 1
        if (colDifference === 0 && rowDifference === direction) {
            return true;
        }
    
        //move forward by 2 from starting row
        if (colDifference === 0 && rowDifference === 2 * direction) {
            if (isWhitePawn && currentRow === 6) {
                return true;
            }
            if (isBlackPawn && currentRow === 1) {
                return true;
            }
        }
    
        return false;
    }
    
    function isValidpawnCapture(currentRow, currentCol, targetRow, targetCol, pawnColor) {
        const rowDifference = targetRow - currentRow;
        const colDifference = Math.abs(targetCol - currentCol);
    
        const direction = pawnColor === "white" ? -1 : 1;
    
        return colDifference === 1 && rowDifference === direction;
    }
    
    function isValidRookMove(currentRow, currentCol, targetRow, targetCol) {
        if (currentRow === targetRow || currentCol === targetCol) {
            
            return isPathClear(currentRow, currentCol, targetRow, targetCol); 
        }
        return false;
    }

    function isValidBishopMove(currentRow, currentCol, targetRow, targetCol) {
        const rowDiff = Math.abs(targetRow - currentRow);
        const colDiff = Math.abs(targetCol - currentCol);
    
        if (rowDiff !== colDiff) return false;
    
      
        let rowDirection = targetRow > currentRow ? 1 : -1;
        let colDirection = targetCol > currentCol ? 1:-1;
        let checkRow = currentRow + rowDirection;
        let checkCol = currentCol + colDirection;
    
        while (checkRow !== targetRow && checkCol !== targetCol) {
            let square = document.getElementById(`square-${checkRow}-${checkCol}`);
            if (square && square.firstElementChild) return false; //blocked
            checkRow += rowDirection;
            checkCol += colDirection;
        }   
        return true;
    }
    function isValidKnightMove(currentRow, currentCol, targetRow, targetCol) {
        const rowDifference = Math.abs(targetRow - currentRow);
        const colDifference = Math.abs(targetCol - currentCol);
        return (rowDifference===2&&colDifference===1)||(rowDifference === 1&&colDifference === 2);
    }
    function isValidQueenMove(currentRow, currentCol, targetRow, targetCol) {
        const rowDifference = Math.abs(targetRow - currentRow);
        const colDifference = Math.abs(targetCol - currentCol);
        const isStraightMove = currentRow === targetRow || currentCol === targetCol;
        const isDiagonalMove = rowDifference === colDifference;
        return (isStraightMove || isDiagonalMove) && isPathClear(currentRow, currentCol, targetRow, targetCol);
    }
    function isValidKingMove(currentRow, currentCol, targetRow, targetCol) {
        const rowDifference = Math.abs(targetRow - currentRow);
        const colDifference = Math.abs(targetCol - currentCol);
        return rowDifference <= 1 && colDifference <= 1;
    }
    function isPathClear(currentRow, currentCol, targetRow, targetCol) {
        const rowStep = currentRow === targetRow ? 0 : (targetRow > currentRow ? 1 : -1);
        const colStep = currentCol === targetCol ? 0 : (targetCol > currentCol ? 1 : -1);
        let row = currentRow + rowStep;
        let col = currentCol + colStep;
        while (row !== targetRow || col !== targetCol) {
            const square = document.getElementById(`square-${row}-${col}`);
            if (square && square.children.length > 0) {
                return false;
            }
            row += rowStep;
            col += colStep;
        }
        
        return true;
    }
    
    function isPathClearForBishop(currentRow, currentCol, targetRow, targetCol, bishopColor) {
        const rowStep = targetRow > currentRow ? 1 : -1;
        const colStep = targetCol > currentCol ? 1 : -1;
    
        let row = currentRow + rowStep;
        let col = currentCol + colStep;
    
        while (row !== targetRow || col !== targetCol) {
            const square = document.getElementById(`square-${row}-${col}`);
    
            if (square.children.length > 0) {
                const piece = square.children[0];
                const pieceColor = piece.getAttribute('data-color');
    
                if (pieceColor === bishopColor) return false;
    
                if (row === targetRow && col === targetCol) return true;
    
            
                return false;
            }
    
            row += rowStep;
            col += colStep;
        }
    
        return true; 
    }
    
   window.startgame = function () {
    showScreen('game-screen');
    const chessboard = document.getElementById('chessboard');
    chessboard.innerHTML = '';
    createChessboard();
    isWhiteTurn = true;
    setTimeout(() => {
        aiMoveIfWhiteTurn();
    }, 400);
};
window.onload = function () {
    showScreen('login-screen');
    fetchStats();
};
});
