

class BetStrategy:

    class BoardStrategy:

        def __init__(self, board, pref_bet_sizes, pref_bet_freqs, gto_freqs):
            self.board = board
            self.pref_bet_sizes = pref_bet_sizes
            self.pref_bet_freqs = pref_bet_freqs
            self.gto_freqs = gto_freqs

        def get_preferred_strategy(self):
            return f"Bet size: {self.pref_bet_sizes}, Bet freq: {self.pref_bet_freqs}"

    def __init__(self, bet_sizes, num_preferred_sizes=1):
        self.bet_sizes = bet_sizes
        self.num_preferred_sizes = num_preferred_sizes
        self.board_strategies = {}
        self.boards = []

    def __getitem__(self, key):
        return self.board_strategies[key].get_preferred_strategy()
    
    def add_board_strategy(self, board, pref_bet_sizes, pref_bet_freqs, gto_freqs):
        if board in self.board_strategies:
            print(f"Warning: overwriting flop strategy for {board}")
        self.board_strategies[board] = BetStrategy.BoardStrategy(board, pref_bet_sizes, pref_bet_freqs, gto_freqs)
        self.boards.append(board)


    def get_boards(self):
        return list(self.boards)

    def get_strategy(self, board):
        return self.board_strategies[board].get_preferred_strategy()

    
