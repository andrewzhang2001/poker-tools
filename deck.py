from card import Card
import random

class Deck:

    def __init__(self):
        ranks = ['2', '3', '4', '5', '6', '7', '8', '9', 'T', 'J', 'Q', 'K', 'A']
        suits = ['clubs', 'diamonds', 'hearts', 'spades']

        self.undealt_cards = [Card(r, s) for r in ranks for s in suits]
        self.dealt_cards = []
        random.shuffle(self.undealt_cards)

    def reset(self):
        self.undealt_cards += self.dealt_cards
        self.dealt_cards = []
        random.shuffle(self.undealt_cards)

    def deal_cards(self, num_cards=1):
        popped_cards = [self.undealt_cards.pop() for _ in range(num_cards)]
        self.dealt_cards += popped_cards
        return popped_cards

