from bet_strategy import BetStrategy
import random
import time

def bb_vs_bu_2bp():
    fields = ["Board", "BU bet size", "BU bet freq", "125%", "75%", "50%", "33", "Check"]
    fields_index = [0, 3, 4, 11, 12, 13, 14, 15, 16]
    bb_vs_bu_2bp_strategy = BetStrategy(["125%", "75%", "50%", "33%", "Check"])
    with open("BB_vs_IP_2BP") as f:
        for line in f.readlines():
            data = line.split()
            try:
                board = data[0]
                bu_bet_size = data[3]
                bu_bet_freq = data[4]
                bu_gto_freqs = data[11:16]
                bb_vs_bu_2bp_strategy.add_board_strategy(board, bu_bet_size, bu_bet_freq, bu_gto_freqs)
            except Exception as e:
                print(e)
    return bb_vs_bu_2bp_strategy

if __name__ == "__main__":
    strategy = bb_vs_bu_2bp()
    while True:
        board = random.choice(strategy.boards)
        response = input(f"Bet size and freq for {board}: ")
        print(f"Answer: {strategy.get_strategy(board)}")
        if response == "exit":
            break
        time.sleep(3)