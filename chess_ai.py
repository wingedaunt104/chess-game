from flask import Flask, request, jsonify
from flask_cors import CORS
import chess
import random

app = Flask(__name__)
CORS(app)

@app.route('/get_move', methods=['POST'])
def get_move():
    data = request.get_json()
    fen = data.get('fen')
    turn = data.get('turn', 1)

    if not fen:
        return jsonify({'error': 'Missing FEN'}), 400

    board = chess.Board(fen)

    piece_values = {
        chess.PAWN: 1,
        chess.KNIGHT: 3,
        chess.BISHOP: 3,
        chess.ROOK: 5,
        chess.QUEEN: 9,
        chess.KING: 0
    }

    def evaluate_board(b):
        score = 0
        for square_index, piece in b.piece_map().items():
            value = piece_values.get(piece.piece_type, 0)
            if piece.piece_type == chess.PAWN:
                row = square_index // 8
                if piece.color:  # white
                    value += row * 0.1
                else:  # black
                    value += (7 - row) * 0.1
            score += value if piece.color == b.turn else -value

        return score


    legal_moves = list(board.legal_moves)
    if not legal_moves:
        return jsonify({'move': []})

    move_scores = []
    for move in legal_moves:
        temp_board = board.copy()
        temp_board.push(move)

        opponent_moves = list(temp_board.legal_moves)
        worst_reply_score = float('inf')
        for opp_move in opponent_moves:
            temp_board2 = temp_board.copy()
            temp_board2.push(opp_move)
            score = evaluate_board(temp_board2)
            worst_reply_score = min(worst_reply_score, score)
        move_scores.append((move, worst_reply_score))


    if turn == 1:  # Easy
        selected_move = random.choice(legal_moves)
    elif turn == 2:  # Medium
        top_moves = sorted(move_scores, key=lambda x: -x[1])[:2]
        selected_move = random.choice([m[0] for m in top_moves])
    else:   # Hard
        selected_move = max(move_scores, key=lambda x: x[1])[0]

    return jsonify({'move': [selected_move.uci()]})

if __name__ == '__main__':
    app.run(debug=True, port=5001)