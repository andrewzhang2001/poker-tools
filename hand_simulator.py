from deck import Deck
from configuration import Configuration, Position, PreflopAction

class Action:
    pass

class Fold(Action):
    pass

class Call(Action):

    def __init__(self, call_size):
        self.call_size = call_size

class Raise(Action):

    def __init__(self, bet_size):
        self.bet_size = bet_size

class Player:

    def __init__(self, position):
        self.position = position

    def get_cards(self, cards):
        self.hand = cards
        self.hand.sort(reverse=True)


    def __str__(self):
        return f"{self.position.name}: {''.join([str(s) for s in self.hand])},"


class HandSimulator:

    def __init__(self):
        pass

class PreflopHandSimulator(HandSimulator):

    def __init__(self, hero_position, stack_depth=100):
        self.hero = hero_position
        self.stack_depth = stack_depth

        self.deck = Deck()
        self.players = [Player(Position.SB), 
                        Player(Position.BB), Player(Position.LJ), Player(Position.HJ), Player(Position.CO), Player(Position.BU)]
        for player in self.players:
            player.get_cards(self.deck.deal_cards(num_cards=2))

        for player in self.players:
            print(player)

if __name__ == "__main__":
    phs = PreflopHandSimulator(Position.BU)