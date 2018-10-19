## -*- python -*-
##=============================================================================
## Copyright (C) 2011 by Denys Duchier
##
## This program is free software: you can redistribute it and/or modify it
## under the terms of the GNU Lesser General Public License as published by the
## Free Software Foundation, either version 3 of the License, or (at your
## option) any later version.
## 
## This program is distributed in the hope that it will be useful, but WITHOUT
## ANY WARRANTY; without even the implied warranty of MERCHANTABILITY or
## FITNESS FOR A PARTICULAR PURPOSE.  See the GNU General Public License for
## more details.
## 
## You should have received a copy of the GNU Lesser General Public License
## along with this program.  If not, see <http://www.gnu.org/licenses/>.
##=============================================================================

from gecode import *

def send_most_money():
    s = space()
    letters = s.intvars(8,0,9)
    S,E,N,D,M,O,T,Y = letters
    s.rel(M,IRT_NQ,0)
    s.rel(S,IRT_NQ,0)
    s.distinct(letters)
    C = [1000, 100, 10, 1,
         1000, 100, 10, 1,
         -10000, -1000, -100, -10, -1]
    X = [S,E,N,D,
         M,O,S,T,
         M,O,N,E,Y]
    s.linear(C,X,IRT_EQ,0)
    money = s.intvar(0,99999)
    s.linear([10000,1000,100,10,1],[M,O,N,E,Y],IRT_EQ,money)
    s.maximize(money)
    s.branch(letters,INT_VAR_SIZE_MIN,INT_VAL_MIN)
    for s2 in s.search():
        print s2.val(money), s2.val(letters)
