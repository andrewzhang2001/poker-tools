from inspect import stack
from deck import Deck
from configuration import Configuration, Position, PreflopAction

class Action:
    pass

class DealCards(Action):

    def __init__(self, player, num_cards):
        self.player = player
        game = self.player.game


class Fold(Action):
    
    def __init__(self, player):
        player.is_active = False
        player.net_result = player.remaining_stack - player.starting_stack
        player.game.actions.append(self)

class Check(Action):

    def __init__(self, player):
        player.game.actions.append(self)


class Call(Action):

    def __init__(self, player, call_size):
        self.call_size = call_size
        player.game.actions.append(self)


class Raise(Action):

    def __init__(self, player, bet_size):
        self.player = player
        self.bet_size = bet_size
        player.remaining_stack -= bet_size
        player.game.actions.append(self)


    def __str__(self):
        return f"{self.player.position.name} raises {self.bet_size/100:.2f}BB"

class Player:

    def __init__(self, position, game, stack_depth = 100):
        self.position = position
        self.game = game
        self.starting_stack = stack_depth * 100
        self.remaining_stack = self.starting_stack
        self.is_active = True

    def add_cards(self, cards):
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
        self.stack_depth = stack_depth * 100
        self.total_pot = 0

        self.deck = Deck()
        self.players = [Player(Position.SB, self), 
                        Player(Position.BB, self), 
                        Player(Position.LJ, self), 
                        Player(Position.HJ, self), 
                        Player(Position.CO, self), 
                        Player(Position.BU, self)]

        for player in self.players:
            player.add_cards(self.deck.deal_cards(num_cards=2))

        self.actions = []

        for player in self.players:
            print(player)

        def init_preflop_standard(self):
            

if __name__ == "__main__":
    phs = PreflopHandSimulator(Position.BU)