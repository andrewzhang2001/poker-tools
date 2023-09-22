

class Card:

    def __init__(self, rank, suit):
        self.rank = rank
        self.suit = suit

    def __repr__(self):
        return f"Card('{self.rank}', '{self.suit}')"

    def __str__(self):
        return f"{self.rank}{self.suit[0]}"

    def __eq__(self, other):
        return self.rank == other.rank and self.suit == other.suit

    def __gt__(self, other):
        ranks = ['2', '3', '4', '5', '6', '7', '8', '9', 'T', 'J', 'Q', 'K', 'A']
        suits = ['clubs', 'diamonds', 'hearts', 'spades']
        if ranks.index(self.rank) > ranks.index(other.rank):
            return True
        elif ranks.index(self.rank) < ranks.index(other.rank):
            return False
        else:
            return suits.index(self.suit) > suits.index(other.suit)