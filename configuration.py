from enum import Enum

class Configuration:

    def __init__(self, oop, ip, preflop_action):
        self.oop = oop
        self.ip = ip
        self.preflop_action = preflop_action


    def get_gto_range(self, hero, stack_depth=100, solutions='gto_wizard'):
        pass

class Position(Enum):
    BU = 0
    CO = 1
    HJ = 2
    LJ = 3
    SB = 9
    BB = 8

class PreflopAction(Enum):
    _LIMP = 1
    _SRP = 2
    _3BP = 3
    _4BP = 4
    _5BP = 5