==========================================
gecode-python - Gecode bindings for Python
==========================================

Requirements
============

  * Python 2.6, 2.7, or 3.2
  * Gecode >= 3.6.0

Installation
============

To install globally:

  python setup.py install

or to install in your home directory:

  python setup.py install --prefix $HOME

which would install the package under ~/lib/python2.7/site-packages (if using
version 2.7 of Python).  If you install in your home, you also need to adjust
environment variable PYTHONPATH to search in $HOME/python2.7 and
$HOME/python2.7/size-packages.

If Gecode is installed in a non standard location, before you can build and
install, you need to adjust environment variables CXXFLAGS, LDFLAGS, and
LD_LIBRARY_PATH.

Documentation
=============

There are many constants in the gecode package.  It is probably easiest to
import everything:

    from gecode import *

IntSet
~~~~~~

intset(int,int)
intset(SPEC)
    returns an IntSet for the corresponding domain.  SPEC is a list of ints and
    pairs of ints (interval).  It might be tempting to simply represent an
    intset as a list of specs, but this would be ambiguous with IntArgs which,
    here, are represented as lists of ints.

Space
~~~~~

space()
    this function creates a Space.

Variables
~~~~~~~~~

Unlike in Gecode, variable objects are not bound to a specific Space.  Each one
actually contains an index with which it is possible to access a Space-bound
Gecode variable.  Variables can be created using the following methods of a
Space:

Space.intvar(int,int)
Space.intvar(IntSet)
    returns an IntVar initialized with the corresponding domain.

Space.boolvar()
    returns a BoolVar initialized with the domain [0,1]

Space.setvar(int glbMin, int glbMax, int lubMin, int lubMax, int cardMin=MIN, int cardMax=MAX)
Space.setvar(int glbMin, int glbMax, IntSet lub, int cardMin=MIN, int cardMax=MAX)
Space.setvar(IntSet glb, int lubMin, int lubMax, int cardMin=MIN, int cardMax=MAX)
Space.setvar(IntSet glb, IntSet lub, int cardMin=MIN, int cardMax=MAX)
    returns a SetVar initialized with the corresponding domain.

Space.intvars(int N, ...)
Space.boolvars(int N)
Space.setvars(int N, ...)
    returns a list of N variables initialized with the domain as stipulated by
    the remaining arguments "...".

An advantage of non Space-bound variables, is that you can use them both to
post constraints in the original space AND to consult their values in
solutions.  Below are Space methods for looking up information about variables.
Each of these methods can either take a variable as argument, or a list (or
tuple) of variables, and returns resp. either a value, or a list of values:

Space.assigned(X)
    returns True if variable X is assigned (determined) in the Space, False
    otherwise.

Space.min(X)
Space.max(X)
Space.med(X)
Space.val(X)
Space.size(X)
Space.width(X)
Space.regret_min(X)
Space.regret_max(X)
    These can be used for both IntVars and BoolVars and have the same meaning
    as in Gecode.

Space.ranges(IntVar)
Space.values(IntVar)
    Return resp. a list of pairs and a list of ints representing the domain of
    the argument variable.

Space.glbSize(SetVar)
Space.lubSize(SetVar)
Space.unknownSize(SetVar)
Space.cardMin(SetVar)
Space.cardMax(SetVar)
Space.lubMin(SetVar)
Space.lubMax(SetVar)
Space.glbMin(SetVar)
Space.glbMax(SetVar)
    These can be used for SetVars and have the same meaning as in Gecode.

Space.glbRanges(SetVar)
Space.lubRanges(SetVar)
Space.unknownRanges(SetVar)
    These return lists of pairs of ints representing the corresponding set
    bounds.

Space.glbValues(SetVar)
Space.lubValues(SetVar)
Space.unknownValues(SetVar)
    These return lists of ints representing the corresponding set bounds.

Space.keep(Var)
Space.keep(Vars)
    Variables can be marked as "kept".  In this case, only such variables
    will be explicitly copied during search.  This could bring substantial
    benefits in memory usage.  Of course, in a solution, you can then only
    look at variables that have been "kept".  If no variable is marked as
    "kept", then they are all kept.  Thus marking variables as "kept" is
    purely an optimization.

Search
~~~~~~

Space.search(restart=False, threads=None, c_d=None, a_d=None)
    returns an iterator of solutions.  Each solution is a Space.
    The restart option selects the Restart search engine, but only if an
    optimization criterion has been specified.  The threads option selects
    and controls the parallel variant of the search engine.  The c_d and a_d
    options control recomputation.

In order to search for optimal solutions, it is necessary to indicate what
needs to be optimized:

Space.minimize(IntVar x)
Space.maximize(IntVar x)
    search for a solution minimizing (resp. maximizing) x.
Space.minimize(IntVar x,IntVar y)
Space.maximize(IntVar x,IntVar y)
    search for a solution minimizing (resp. maximizing) the ratio x/y.

Gist
~~~~

Space.gist(onclick=None, threads=None, c_d=None, a_d=None)
    if your installation of Gecode has Gist support, then this will invoke it.
    onclick is an inspector or an iterable of inspectors.  An inspector is
    a callable, or a class whose instances are callables, that has/have been
    specially annoted by a decorator:

    @inspector("My Inspector 1")
    def show1(s2):
        print s2.values([X1,X2])

    Note that s2 is not necessarily a solution!  You may also define a
    textinspector to show textual output in a graphical window:

    @textinspector("My Inspector 2")
    def show2(s2):
        return "X1=%s X2=%s" % s2.values([X1,X2])

    A textinspector must return a string.

Bound Variables
~~~~~~~~~~~~~~~

A bound variable is essentially a pair of a non-bound variable and a Space.

IntVal.__call__(Space)
BoolVar.__call__(Space)
SetVar.__call__(Space)
    a bound variable can be created by applying a non-bound variable to a
    Space.

Space.bind(X)
    returns a bound variable for X, bound to this space; if X is a list of
    variables, this returns a list of bound variables.

Constants
~~~~~~~~~

All constants used in Gecode are available with the same names in these
bindings.

Constraints
~~~~~~~~~~~

In Gecode, all constraints take a space as first argument.  In these bindings,
all constraints are methods of Space.  Everywhere Gecode would use an XXXArgs
argument, here, you should simply use a list (or tuple) of XXX.  All gecode
constraints are available (except "extensional", which are not yet
implemented).  All branchings are available except those with parameters that
require additional implementation in C++.  Please refer to the Gecode
documentation.

DISJUNCTORS
~~~~~~~~~~~

Disjunctors are an experimental extension to Gecode implemented by the
gecode-python bindings.  They provide support for disjunctions of clauses,
where each clause is a conjunction of constraints:

    C1 or C2 or ... or Cn

Each clause is executed "speculatively": this means it does not affect the main
space.  When a clause becomes failed, it is discarded.  When only one clause
remains, it is committed: this means that it now affects the main space.

Example:

Consider the problem where either X=Y=0 or X=Y+(1 or 2) for variable X and Y
that take values in 0..3.

    s = space()
    x,y = s.intvars(2,0,3),

First, we must create a disjunctor as a manager for our 2 clauses:

    d = s.disjunctor()

We can now create our first clause:

    c1 = d.clause()

This clause wants to constrain x and y to 0.  However, since it must be
executed "speculatively", it must operate on new variables x1 and y1 that
shadow x and y:

    x1,y1 = c1.intvars(2,0,3)
    c1.forward([x,y],[x1,y1])

The forward(...) stipulation indicates which global variable is shadowed by
which clause-local variable.  Now we can post the speculative clause-local
constraints for X=Y=0:

    c1.rel(x1,IRT_EQ,0),
    c1.rel(y1,IRT_EQ,0),

We now create the second clause which uses x2 and y2 to shadow x and y:

    c2 = d.clause()
    x2,y2 = c2.intvars(2,0,3)
    c2.forward([x,y],[x2,y2])

However, this clause also needs a clause-local variable z2 taking values 1 or
2 in order to post the clause-local constraint x2=y2+z2:

    z2 = c2.intvar(1,2)
    c2.linear([-1,1,1],[x2,y2,z2],IRT_EQ,0)

Finally, we can branch and search:

    s.branch([x,y],INT_VAR_SIZE_MIN,INT_VAL_MIN)
    for sol in s.search():
        print sol.val([x,y])
