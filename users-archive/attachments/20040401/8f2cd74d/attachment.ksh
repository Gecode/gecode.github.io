Only in gecode: AUTHORS
Only in gecode: ChangeLog
Only in gecode: Makefile.am
Only in gecode: Makefile.cvs
Only in gecode: NEWS
Only in gecode: README
Only in gecode/benchmarks/systems/mozart: Golf.oz
diff -r -x CVS -I '\*[ ]*\$' gecodeHead/benchmarks/systems/mozart/Main.oz gecode/benchmarks/systems/mozart/Main.oz
47a48,49
>    Golf(golf)
>    at 'Golf.ozf'
58c60,65
<    [o(name:   'alpha_eq'          
---
>    [o(name:   'golf'
>       search: one
>       script: Golf.golf
>       repeat: 5
>      )
>     o(name:   'alpha_eq'          
diff -r -x CVS -I '\*[ ]*\$' gecodeHead/benchmarks/systems/mozart/Makefile gecode/benchmarks/systems/mozart/Makefile
16c16
< 	Donald Money
---
> 	Donald Money Golf
38,43d37
< 
< 	
< 
< 
< 
< 
diff -r -x CVS -I '\*[ ]*\$' gecodeHead/config.hh gecode/config.hh
16a17,20
> #ifdef HAVE_CONFIG_H
> #include "config.h"
> #endif
> 
Only in gecode: configure.ac
Only in gecode/examples: Makefile.am
diff -r -x CVS -I '\*[ ]*\$' gecodeHead/examples/bench.cc gecode/examples/bench.cc
14a15
> #include "gecode-fs.hh"
35a37
> #include "golf-reified.hh"
201a204
>   DOBENCH("golf",          5, RUN_ONE(Golf::Golf,   Search::DFS));           \
Only in gecode/examples: fsmoretests.cc
Only in gecode/examples: fstest.cc
Only in gecode/examples: fstest2.cc
Only in gecode/examples: fstest_ste.cc
Only in gecode/examples: golf-reified.cc
Only in gecode/examples: golf-reified.hh
Only in gecode/examples: intsettest.cc
Only in gecode/examples: knapsack.cc
Only in gecode: fs
Only in gecode: gecode-fs-prop.hh
Only in gecode: gecode-fs.hh
Only in gecode/generic: Makefile.am
diff -r -x CVS -I '\*[ ]*\$' gecodeHead/generic/kernel.cc gecode/generic/kernel.cc
21c21
< VarModBoard*   Variable::vmb[VTI_MAX];
---
> VarModBoardArray Variable::vmb;
257d256
< 
diff -r -x CVS -I '\*[ ]*\$' gecodeHead/generic/kernel.hh gecode/generic/kernel.hh
47c47,48
<   VTI_MAX = 1
---
>   VTI_FS  = 1,
>   VTI_MAX = 2
106a108,124
> class EmptyVarModBoard : public VarModBoard {
> public:
>   EmptyVarModBoard(VarTypeId x) : VarModBoard(x) {}
>   virtual void process(void) {}
> };
> 
> class VarModBoardArray {
> private:
>   VarModBoard** vmb;
> public:
>   VarModBoardArray(void);
>   VarModBoard*& operator[](int);
>   const VarModBoard* operator[](int) const;
> private:
>   void* operator new(size_t);
>   void operator delete(void*);
> };
116c134
<   static VarModBoard*  vmb[VTI_MAX];
---
>   static VarModBoardArray vmb;
diff -r -x CVS -I '\*[ ]*\$' gecodeHead/generic/kernel.icc gecode/generic/kernel.icc
20a21
> #include <iostream>
574a576,597
> 
> /*
>  * Variable modification board array
>  *
>  */
> 
> forceinline
> VarModBoardArray::VarModBoardArray(void) {
>   vmb = static_cast<VarModBoard**>(malloc(VTI_MAX*sizeof(VarModBoard*)));
>   for(int i=VTI_MAX;i--;)
>     vmb[i] = new EmptyVarModBoard((VarTypeId)i);
> }
> 
> forceinline VarModBoard*&
> VarModBoardArray::operator[](int i) {
>   return vmb[i];
> }
> 
> forceinline const VarModBoard*
> VarModBoardArray::operator[](int i) const {
>   return vmb[i];
> }
diff -r -x CVS -I '\*[ ]*\$' gecodeHead/generic/relations.icc gecode/generic/relations.icc
13a14,15
> #include <config.hh>
> 
Only in gecode/int: Makefile.am
diff -r -x CVS -I '\*[ ]*\$' gecodeHead/int/var/iter-basic.icc gecode/int/var/iter-basic.icc
117c117,118
<   RangeList* rs;
---
>   //  const RangeList* rs;
>   const RangeList* rs;
119c120,121
<   RangesRangeList(RangeList*);
---
>   RangesRangeList(void) : rs(NULL) {}
>   RangesRangeList(const RangeList*);
131c133
< RangesRangeList::RangesRangeList(RangeList* rs0) 
---
> RangesRangeList::RangesRangeList(const RangeList* rs0) 
diff -r -x CVS -I '\*[ ]*\$' gecodeHead/int/var/iter-functional.icc gecode/int/var/iter-functional.icc
364d363
< 
384a384
>   do {
388a389
>   } while(a.max() < b.min());
390,391c391,392
<   ma = Arith::min(a.max(),b.max());
<   mi = Arith::max(a.min(),b.min());
---
>   ma = std::min(a.max(),b.max());
>   mi = std::max(a.min(),b.min());
418d418
< 
429a430,444
> 
> //If IA and IB are the same type, it is possible to swap pointers, and use this
> //optimised version:
> 
> template<class I>
> class RangesUnion<I,I> : public RangesMinMax {
> protected:
>   I a; I b;
> public:
>   RangesUnion(void);
>   RangesUnion(I&, I&);
>   
>   void operator++(void);
> };
> 
432c447
< template <class IA, class IB>
---
> template <class I>
434c449
< RangesUnion<IA,IB>::operator++(void) {
---
> RangesUnion<I,I>::operator++(void) {
451c466
<     ma = Arith::max(ma,b.max()); ++b;
---
>     ma = std::max(ma,b.max()); ++b;
456c471
<     ma = Arith::max(ma,a.max()); ++a; 
---
>     ma = std::max(ma,a.max()); ++a; 
459a475,486
> //  if (a.min()<b.min()) { 
> //    mi = a.min(); ma = a.max(); ++a;
> //  } else {
> //    mi = b.min(); ma = b.max(); ++b;
> //  } 
> //  bool goOn;
> //  do {
> //    goOn = false;
> //    if (a() && a.min()<=ma+1 ) {ma = std::max(ma,a.max()); ++a; goOn=true;}
> //    if (b() && b.min()<=ma+1 ) {ma = std::max(ma,b.max()); ++b; goOn=true;}    
> //  } while (goOn);
> 
462a490,515
> inline void
> RangesUnion<IA,IB>::operator++(void) {
>   if (!a() && !b()) {
>     finish(); return;
>   }
>   if (!a()) {
>     mi = b.min(); ma = b.max(); ++b; return;
>   }
>   if (!b()) {
>     mi = a.min(); ma = a.max(); ++a; return;
>   }
>   if (a.min()<b.min()) { 
>     mi = a.min(); ma = a.max(); ++a;
>   } else {
>     mi = b.min(); ma = b.max(); ++b;
>   } 
>   bool goOn;
>   do {
>     goOn = false;
>     if (a() && a.min()<=ma+1 ) {ma = std::max(ma,a.max()); ++a; goOn=true;}
>     if (b() && b.min()<=ma+1 ) {ma = std::max(ma,b.max()); ++b; goOn=true;}    
>   } while (goOn);
> }
> 
> 
> template <class IA, class IB>
465a519,523
> template <class I>
> forceinline
> RangesUnion<I,I>::RangesUnion(void) {}
> 
> 
472a531,538
> template <class I>
> forceinline
> RangesUnion<I,I>::RangesUnion(I& a0, I& b0) 
>   : a(a0), b(b0) {
>   operator++();
> }
> 
> 
diff -r -x CVS -I '\*[ ]*\$' gecodeHead/int/var/offset.icc gecode/int/var/offset.icc
32c32
< OffIntVar::off(void) { return c; }
---
> OffIntVar::off(void) const { return c; }
diff -r -x CVS -I '\*[ ]*\$' gecodeHead/int/var.hh gecode/int/var.hh
254c254
< 
---
> template <class I> class RangesCompl;
598c598
<   int    off(void); void off(int);
---
>   int    off(void) const; void off(int);
diff -r -x CVS -I '\*[ ]*\$' gecodeHead/interfaces/alice/FD-sig.aml gecode/interfaces/alice/FD-sig.aml
17c17
<     type fdvar
---
>     type intvar
19a20,21
>     exception NotAssigned
> 
27,35c29,32
<     val fdvar :  Space.space * domain ->  fdvar
<     val fdvarVec :  Space.space * int * domain ->  fdvar vector
<     val range :  Space.space * (int * int) ->  fdvar
<     val rangeVec :  Space.space * int * (int * int) ->  fdvar vector
< 
<     (* Allocation of reified finite domain variables *)
<     val fdvarR :  Space.space * domain *  boolvar ->  fdvar
<     val fdvarVecR :  Space.space * int * domain *  boolvar ->
< 		     fdvar vector
---
>     val intvar :  Space.space * domain -> intvar
>     val intvarVec :  Space.space * int * domain -> intvar vector
>     val range :  Space.space * (int * int) -> intvar
>     val rangeVec :  Space.space * int * (int * int) -> intvar vector
38,39c35,46
<     val boolvar :  Space.space ->  boolvar
<     val boolvarVec :  Space.space * int ->  boolvar vector
---
>     val boolvar :  Space.space -> boolvar
>     val boolvarVec :  Space.space * int -> boolvar vector
> 
>     (* Constraining an intvar to a boolvar *)
> 
>     val intvar2boolvar : Space.space * intvar -> boolvar
> 
>     (* Value assignment *)
> 
>     datatype avalsel = AVAL_MIN | AVAL_MED | AVAL_MAX
> 
>     val assign : Space.space * intvar vector * avalsel -> unit
42,44c49
<     val dom :  Space.space *  fdvar * (int * int) vector -> unit
<     val domR :  Space.space *  fdvar * (int * int) vector *
< 	        boolvar -> unit
---
>     val dom :  Space.space * intvar * (int * int) vector -> unit
64,77c69,73
<     val rel :  Space.space *  fdvar * relation *
< 	       fdvar -> unit
<     val relI :  Space.space *  fdvar * relation * int -> unit
<     val relR :  Space.space *  fdvar * relation *  fdvar *
< 	        boolvar -> unit
<     val relIR :  Space.space *  fdvar * relation * int *
< 		 boolvar -> unit
<     val eq :  Space.space *  fdvar *  fdvar *
< 	     conlevel -> unit
<     val eqV :  Space.space *  fdvar vector * conlevel -> unit
<     val eqR :  Space.space *  fdvar *  fdvar *
< 	       boolvar * conlevel -> unit
<     val eqVR :  Space.space *  fdvar vector *  boolvar *
< 	       conlevel -> unit
---
>     val rel  :  Space.space * intvar * relation * intvar -> unit
>     val relI :  Space.space * intvar * relation * int -> unit
> 
>     val equal  : Space.space * intvar * intvar * conlevel -> unit
>     val equalV : Space.space * intvar vector * conlevel -> unit
80,82c76,78
<     val distinct :  Space.space *  fdvar vector * conlevel -> unit
<     val distinctI :  Space.space * (int *  fdvar) vector *
< 		    conlevel -> unit
---
>     val distinct : Space.space * intvar vector * conlevel -> unit
>     val distinctOffset : Space.space * (int * intvar) vector *
> 			 conlevel -> unit
85c81
<     val countII :  Space.space *  fdvar vector * relation *
---
>     val countII : Space.space * intvar vector * relation *
87,92c83,88
<     val countVI :  Space.space *  fdvar vector * relation *
< 		   fdvar * relation * int -> unit
<     val countIV :  Space.space *  fdvar vector * relation *
< 		  int * relation *  fdvar -> unit
<     val countVV :  Space.space *  fdvar vector * relation *
< 		   fdvar * relation *  fdvar -> unit
---
>     val countVI : Space.space * intvar vector * relation *
> 		 intvar * relation * int -> unit
>     val countIV : Space.space * intvar vector * relation *
> 		  int * relation * intvar -> unit
>     val countVV : Space.space * intvar vector * relation *
> 		 intvar * relation * intvar -> unit
95,100c91,96
<     val element :  Space.space *  fdvar vector *  fdvar *
< 		   fdvar -> unit
<     val elementI :  Space.space * int vector *  fdvar *
< 		    fdvar -> unit
<     val lex :  Space.space *  fdvar vector * relation *
< 	       fdvar vector -> unit
---
>     val element : Space.space * intvar vector * intvar *
> 		 intvar -> unit
>     val elementI : Space.space * int vector * intvar *
> 		  intvar -> unit
>     val lex : Space.space * intvar vector * relation *
> 	     intvar vector -> unit
103,117c99,106
<     val bool_not :  Space.space *  boolvar *  boolvar -> unit
<     val bool_and :  Space.space *  boolvar *  boolvar *
< 		    boolvar -> unit
<     val bool_or  :  Space.space *  boolvar *  boolvar *
< 		    boolvar -> unit
<     val bool_imp :  Space.space *  boolvar *  boolvar *
< 		    boolvar -> unit
<     val bool_eq  :  Space.space *  boolvar *  boolvar *
< 		    boolvar -> unit
<     val bool_xor :  Space.space *  boolvar *  boolvar *
< 		    boolvar -> unit
<     val bool_andV:  Space.space *  boolvar vector *
< 		    boolvar -> unit
<     val bool_orV :  Space.space *  boolvar vector *
< 		    boolvar -> unit
---
>     val nega  : Space.space * boolvar * boolvar -> unit
>     val conj  : Space.space * boolvar * boolvar * boolvar -> unit
>     val disj  : Space.space * boolvar * boolvar * boolvar -> unit
>     val impl  : Space.space * boolvar * boolvar * boolvar -> unit
>     val equi  : Space.space * boolvar * boolvar * boolvar -> unit
>     val exor  : Space.space * boolvar * boolvar * boolvar -> unit
>     val conjV : Space.space * boolvar vector * boolvar -> unit
>     val disjV : Space.space * boolvar vector * boolvar -> unit
120c109
<     val linear :  Space.space * (int *  fdvar) vector * relation *
---
>     val linear : Space.space * (int * intvar) vector * relation *
122,123d110
<     val linearR :  Space.space * (int *  fdvar) vector * relation *
< 		  int *  boolvar * conlevel -> unit
126,133c113,153
<     val min :  Space.space *  fdvar vector *  fdvar -> unit
<     val max :  Space.space *  fdvar vector *  fdvar -> unit
<     val abs :  Space.space *  fdvar *  fdvar * conlevel ->
< 	      unit
<     val mult:  Space.space *  fdvar *  fdvar *
< 	       fdvar -> unit
<     val power:  Space.space *  fdvar *  fdvar *
< 		fdvar -> unit
---
>     val min : Space.space * intvar vector * intvar -> unit
>     val max : Space.space * intvar vector * intvar -> unit
>     val abs : Space.space * intvar * intvar * conlevel -> unit
>     val mult: Space.space * intvar * intvar * intvar -> unit
>     val power: Space.space * intvar * intvar * intvar -> unit
> 
>     structure Reified :
> 	sig
> 	    val intvar : Space.space * domain * boolvar -> intvar
> 	    val intvarVec : Space.space * int * domain * boolvar ->
> 			    intvar vector
> 	    val dom : Space.space * intvar * (int * int) vector *
> 		      boolvar -> unit
> 	    val rel : Space.space * intvar * relation * intvar *
> 		      boolvar -> unit
> 	    val relI : Space.space * intvar * relation * int *
> 		       boolvar -> unit
> 	    val equal : Space.space * intvar * intvar *
> 			boolvar * conlevel -> unit
> 	    val equalV : Space.space * intvar vector * boolvar *
> 			 conlevel -> unit
> 	    val linear : Space.space * (int * intvar) vector * relation *
> 			 int * boolvar * conlevel -> unit
> 	end
> 
>     structure Reflect :
> 	sig
> 	    val min : Space.space * intvar -> int
> 	    val max : Space.space * intvar -> int
> 	    val value : Space.space * intvar -> int (* NotAssigned *)
> 	    val boolVal : Space.space * boolvar -> bool (* NotAssigned *)
> 	    val boolvar2intvar : boolvar -> intvar
> (*	    val mid : Space.space * intvar -> int *)
> (*	    val nextLarger : Space.space * fd * int -> int *)
> (*	    val nextSmaller : Space.space * fd * int -> int *)
> (*	    val size : Space.space * intvar -> int *)
> (*	    val dom : fd -> domain *)
> (*	    val domList : fd -> int list *)
> (*	    val nbSusps : fd -> int *)
> (*	    val eq : fd * fd -> bool (* token eq *) *)
> 	end
156c176
<     val branch :  Space.space *  fdvar vector * b_var_sel *
---
>     val branch : Space.space * intvar vector * b_var_sel *
158,168d177
< 				
<     (* Value assignment *)
< 
<     datatype avalsel = AVAL_MIN | AVAL_MED | AVAL_MAX
< 
<     val assign :  Space.space *  fdvar vector * avalsel -> unit
< 
<     (* Access to variables *)
< 
<     exception NoFD
<     exception NoBool
170,175d178
<     val boolvar2fdvar :  boolvar ->  fdvar
< 					     
<     val getMin :  Space.space *  fdvar -> int
<     val getMax :  Space.space *  fdvar -> int
<     val getVal :  Space.space *  fdvar -> int      (* NoVal *)
<     val getBool :  Space.space *  boolvar -> bool  (* NoBool *)
diff -r -x CVS -I '\*[ ]*\$' gecodeHead/interfaces/alice/FD.aml gecode/interfaces/alice/FD.aml
20,22d19
<     exception NoFD
<     exception NoBool
< 
56c53,57
<    open UnsafeGecode
---
>     exception NotAssigned
> 
>    
>    structure UnsafeGecodeFD = UnsafeGecode.UnsafeGecodeFD
>    open UnsafeGecodeFD
58c59
<    type fdvar
---
>    type intvar
67,84c68,75
<    fun fdvar(space,v) = UnsafeGecode.fdvar(space,
< 					   Vector.map
< 					       (fn SINGLE i => (i,i)
< 						 | RANGE r => r) v)
< 		 
<    fun fdvarR(space,v, b) = UnsafeGecode.fdvarR(space,
< 						Vector.map
< 						    (fn SINGLE i => (i,i)
< 						      | RANGE r => r) v,
< 						b)
< 		      
<    fun fdvarVec(space,n, v) = Vector.tabulate (n, fn _ => fdvar(space,v))
<    fun fdvarVecR(space,n, v, b) = Vector.tabulate (n, fn _ => fdvarR(space,v,b))
< 			    
<    fun range(space,r) = fdvar (space,#[RANGE r])
<    fun rangeVec(space,n,r) = fdvarVec(space, n, #[RANGE r])
< 		       
<    fun boolvar space = UnsafeGecode.boolvar space
---
>    fun intvar(space,v) = UnsafeGecodeFD.intvar(space,
> 					       Vector.map
> 						   (fn SINGLE i => (i,i)
> 						     | RANGE r => r) v)
>    fun intvarVec(space,n, v) = Vector.tabulate (n, fn _ => intvar(space,v))
>    fun range(space,r) = intvar (space,#[RANGE r])
>    fun rangeVec(space,n,r) = intvarVec(space, n, #[RANGE r])
>    fun boolvar space = UnsafeGecodeFD.boolvar space
86,87c77,79
< 		      
<    val boolvar2fdvar = UnsafeValue.cast
---
> 		 
>    fun intvar2boolvar(space,d) = (dom(space,d,#[(0,1)]);
> 				  UnsafeValue.cast d)
89,94c81,96
<    fun getVal (s,v) =
<        let
< 	   val min = getMin(s,v)
<        in
< 	   if min<>getMax(s,v) then raise NoFD
< 	   else min
---
>    structure Reified =
>        struct
>            fun intvar(space,v, b) =
> 	       UnsafeGecodeFD.intvarR(space,
> 				    Vector.map
> 					(fn SINGLE i => (i,i)
> 					  | RANGE r => r) v,
> 				    b)           
> 	   fun intvarVec(space,n, v, b) =
> 	       Vector.tabulate (n, fn _ => intvar(space,v,b))
> 	   val dom = UnsafeGecodeFD.domR
> 	   val rel = UnsafeGecodeFD.relR
> 	   val relI = UnsafeGecodeFD.relIR
> 	   val equal = UnsafeGecodeFD.equalR
> 	   val equalV = UnsafeGecodeFD.equalVR
> 	   val linear = UnsafeGecodeFD.linearR
97c99,112
<    fun getBool v = getVal(boolvar2fdvar v)=1 handle NoFD => raise NoBool
---
>    structure Reflect =
>        struct
>            val min = UnsafeGecodeFD.getMin
> 	   val max = UnsafeGecodeFD.getMax
> 	   fun value (s,v) =
> 	       let
> 		   val min = min(s,v)
> 	       in
> 		   if min<>max(s,v) then raise NotAssigned
> 		   else min
> 	       end
> 	   val boolvar2intvar = UnsafeValue.cast
> 	   fun boolVal v = value(boolvar2intvar v)=1
>        end
Only in gecode/interfaces/alice: FS-sig.aml
Only in gecode/interfaces/alice: FS.aml
diff -r -x CVS -I '\*[ ]*\$' gecodeHead/interfaces/alice/GecodeSpace.cc gecode/interfaces/alice/GecodeSpace.cc
67,69d66
<   for (int i = noOfIntVars; i<intArraySize*2; i++) {
<     na[i] = tmpVar[0];
<   }
302a300,471
> 
> // FS Variables
> 
> int GecodeSpace::AddFSVariable() {
>   if (!enter()) return -1;
> 
>   if (noOfFSVars >= fsArraySize) {
>     EnlargeFSVarArray();
>   }
>   
>   noOfFSVars++;
>   return noOfFSVars-1;
> }
> 
> void GecodeSpace::EnlargeFSVarArray() {
>   if (!enter()) return;
> 
>   FSVarArray na(fsArraySize*2);
>   for (int i=noOfFSVars; i--;)
>     na[i] = fss[i];
> 
>   fss = na;
> 
>   fsArraySize *= 2;
> 
>   return;
> }
> 
> RangesRangeList GecodeSpace::fs_upperBound(int s) {
>   enter();
>   return fss[s].rangesUpperBound();
> }
> RangesRangeList GecodeSpace::fs_lowerBound(int s) {
>   enter();
>   return fss[s].rangesLowerBound();
> }
> RangesMinus<RangesRangeList, RangesRangeList> GecodeSpace::fs_unknown(int s) {
>   enter();
>   RangesRangeList ub = fss[s].rangesUpperBound();
>   RangesRangeList lb = fss[s].rangesLowerBound();
>   RangesMinus<RangesRangeList, RangesRangeList> m(ub,lb);
>   return m;
> }
> 
> unsigned int GecodeSpace::fs_upperBoundSize(int s) {
>   return fss[s].upperBoundSize();
> }
> unsigned int GecodeSpace::fs_lowerBoundSize(int s) {
>   return fss[s].lowerBoundSize();
> }
> 
> int GecodeSpace::fs_cardinalityMin(int s) {
>   enter();
>   return fss[s].cardMin();
> }
> int GecodeSpace::fs_cardinalityMax(int s) {
>   enter();
>   return fss[s].cardMax();
> }
> bool GecodeSpace::fs_assigned(int s) {
>   enter();
>   return fss[s].assigned();
> }
> 
> void GecodeSpace::fs_include(int d, int s) {
>   if (!enter()) return;
>   ::include(fss[s], is[d]);
> }
> void GecodeSpace::fs_exclude(int d, int s) {
>   if (!enter()) return;
>   ::exclude(fss[s], is[d]);
> }
> void GecodeSpace::fs_the(int d, int s) {
>   if (!enter()) return;
>   ::the(fss[s], is[d]);
> }
> void GecodeSpace::fs_card(int s, int d) {
>   if (!enter()) return;
>   ::card(fss[s], is[d]);
> }
> void GecodeSpace::fs_cardRange(int s, int min, int max) {
>   if (!enter()) return;
>   ::cardRange(fss[s], min, max);
> }
> 
> void GecodeSpace::fs_superOfInter(int s1, int s2, int s3) {
>   if (!enter()) return;
>   ::superOfInter(fss[s1], fss[s2], fss[s3]);
> }
> void GecodeSpace::fs_subOfUnion(int s1, int s2, int s3) {
>   if (!enter()) return;
>   ::subOfUnion(fss[s1], fss[s2], fss[s3]);
> }
> 
> void GecodeSpace::fs_subset(int s1, int s2) {
>   if (!enter()) return;
>   ::subset(fss[s1], fss[s2]);
> }
> void GecodeSpace::fs_disjoint(int s1, int s2) {
>   if (!enter()) return;
>   ::disjoint(fss[s1], fss[s2]);
> }
> void GecodeSpace::fs_union(int s1, int s2, int s3) {
>   if (!enter()) return;
>   ::fsunion(fss[s1], fss[s2], fss[s3]);
> }
> void GecodeSpace::fs_complement(int s1, int s2) {
>   if (!enter()) return;
>   ::complement(fss[s1], fss[s2]);
> }
> void GecodeSpace::fs_intersection(int s1, int s2, int s3) {
>   if (!enter()) return;
>   ::intersection(fss[s1], fss[s2], fss[s3]);
> }
> void GecodeSpace::fs_difference(int s1, int s2, int s3) {
>   if (!enter()) return;
>   ::difference(fss[s1], fss[s2], fss[s3]);
> }
> void GecodeSpace::fs_partition(int s1, int s2, int s3) {
>   if (!enter()) return;
>   ::partition(fss[s1], fss[s2], fss[s3]);
> }
> void GecodeSpace::fs_unionn(const IntArgs& vars, int s) {
>   if (!enter()) return;
>   makefsvararray(a, vars);
>   ::unionn(a, fss[s]);
> }
> void GecodeSpace::fs_intersectionn(const IntArgs& vars, int s) {
>   if (!enter()) return;
>   makefsvararray(a, vars);
>   ::intersectionn(a, fss[s]);
> }
> void GecodeSpace::fs_partitionn(const IntArgs& vars, int s) {
>   if (!enter()) return;
>   makefsvararray(a, vars);
>   ::partitionn(a, fss[s]);
> }
> void GecodeSpace::fs_includeR(int d, int s, int b) {
>   if (!enter()) return;
>   ::includeR(fss[s],is[d],intvar2boolvar(is[b]));
> }
> void GecodeSpace::fs_includeRI(int i, int s, int b) {
>   if (!enter()) return;
>   ::includeR(fss[s],i,intvar2boolvar(is[b]));
> }
> void GecodeSpace::fs_selectUnion(int s, const IntArgs& vars, int ss) {
>   if (!enter()) return;
>   makefsvararray(a, vars);
>   ::selectUnion(fss[s], a, fss[ss]);
> }
> void GecodeSpace::fs_selectInter(int s, const IntArgs& vars, int ss) {
>   if (!enter()) return;
>   makefsvararray(a, vars);
>   ::selectUnion(fss[s], a, fss[ss]);
> }
> void GecodeSpace::fs_selectSets(int s, const IntArgs& vars, int d) {
>   if (!enter()) return;
>   makefsvararray(a, vars);
>   ::selectSets(fss[s], a, is[d]);
> }
> 
> void GecodeSpace::fs_branch(const IntArgs& vars, FSBvarSel varSel, 
> 			    FSBvalSel valSel) {
>   if (!enter()) return;
>   makefsvararray(a, vars);
>   ::branch(a, varSel, valSel);
> }
> 
> void GecodeSpace::fs_print(int s) {
>   if (!enter()) return;
>   std::cout << fss[s];
> }
diff -r -x CVS -I '\*[ ]*\$' gecodeHead/interfaces/alice/GecodeSpace.hh gecode/interfaces/alice/GecodeSpace.hh
18c18,19
< #include "gecode-search.hh"
---
> #include "gecode-fs.hh"
> //#include "gecode-search.hh"
31a33,36
> #define makefsvararray(a,vars)                                 \
>   FSVarArgs a(vars.size());                              \
> { int s = vars.size(); for (int i=s; i--;) a[i] = fss[vars[i]]; }
> 
35d39
<   IntVarArray tmpVar;
37a42,45
>   
>   FSVarArray fss;
>   int noOfFSVars;
>   int fsArraySize;
39a48
>   void EnlargeFSVarArray();
41d49
<   
49,54c57,60
<   GecodeSpace() : tmpVar(1,0,0), is(10, 0,0), noOfIntVars(0),
< 		  intArraySize(10)
<   {
<     for (int i=10; i--;)
<       is[i] = tmpVar[0];
<   }
---
>   GecodeSpace() : is(3, 0,0), noOfIntVars(0),
> 		  intArraySize(3),
> 		  fss(3), noOfFSVars(0), fsArraySize(3)
>   {}
61c67,70
<                                 tmpVar(s.tmpVar.copy()) {}
---
>  				fss(s.fss.copy()),
>  				noOfFSVars(s.noOfFSVars),
>  				fsArraySize(s.fsArraySize)
>   {}
145a155,221
> 
>   // Finite Set Variables / Constraints
> 
>   int AddFSVariable();
>   
>   RangesRangeList fs_upperBound(int);
>   RangesRangeList fs_lowerBound(int);
>   RangesMinus<RangesRangeList, RangesRangeList> fs_unknown(int);
>   int fs_cardinalityMin(int);
>   int fs_cardinalityMax(int);
>   bool fs_assigned(int);
> 
>   template<class I>
>   void fs_lowerBound(int s, I& i) {
>     if (!enter()) return;
>     if (Space::failed())
>       return;
>     
>     if ( (fss[s].includeI(i)) == ME_FS_FALSE)
>       Space::fail();
>   }
> 
>   template<class I>
>   void fs_upperBound(int s, I& i) {
>     if (!enter()) return;
>     if (Space::failed())
>       return;
>     
>     if ( (fss[s].intersectI(i)) == ME_FS_FALSE)
>       Space::fail();
>   }
> 
> 
>   unsigned int fs_upperBoundSize(int);
>   unsigned int fs_lowerBoundSize(int);
> 
>   void fs_include(int, int);
>   void fs_exclude(int, int);
>   void fs_the(int, int);
>   void fs_card(int, int);
>   void fs_cardRange(int, int, int);
> 
>   void fs_superOfInter(int, int, int);
>   void fs_subOfUnion(int, int, int);
>   
>   void fs_subset(int, int);
>   void fs_disjoint(int, int);
>   void fs_union(int, int, int);
>   void fs_complement(int, int);
>   void fs_intersection(int, int, int);
>   void fs_difference(int, int, int);
>   void fs_partition(int, int, int);
>   void fs_unionn(const IntArgs&, int);
>   void fs_intersectionn(const IntArgs&, int);
>   void fs_partitionn(const IntArgs&, int);
> 
>   void fs_includeR(int, int, int);
>   void fs_includeRI(int, int, int);
> 
>   void fs_selectUnion(int, const IntArgs&, int);
>   void fs_selectInter(int, const IntArgs&, int);
>   void fs_selectSets(int, const IntArgs&, int);
> 
>   void fs_branch(const IntArgs&, FSBvarSel, FSBvalSel);
>   
>   void fs_print(int);
> 
diff -r -x CVS -I '\*[ ]*\$' gecodeHead/interfaces/alice/LINEAR-sig.aml gecode/interfaces/alice/LINEAR-sig.aml
31c31
< 	    FD of FD.fdvar
---
> 	    FD of FD.intvar
diff -r -x CVS -I '\*[ ]*\$' gecodeHead/interfaces/alice/Linear.aml gecode/interfaces/alice/Linear.aml
24c24
< 	    FD of FD.fdvar
---
> 	    FD of FD.intvar
96c96
< 		|x => FD (FD.fdvar(s,x))
---
> 		|x => FD (FD.intvar(s,x))
106c106
< 		|x => Vector.map (fn v =>FD(v)) (FD.fdvarVec(s,n,x))
---
> 		|x => Vector.map (fn v =>FD(v)) (FD.intvarVec(s,n,x))
149c149
< 	datatype leaf = VAR of FD.fdvar | CONST of int
---
> 	datatype leaf = VAR of FD.intvar | CONST of int
245c245
< 	fun postReified(s,r,c,e) = post'(s,r,e,(fn(s',a',r',b',e')=>FD.linearR(s',a',r',b',c,e')))
---
> 	fun postReified(s,r,c,e) = post'(s,r,e,(fn(s',a',r',b',e')=>FD.Reified.linear(s',a',r',b',c,e')))
332c332
< 			val _ = FD.bool_not(s,v,nv)
---
> 			val _ = FD.nega(s,v,nv)
352c352
< 		in FD.relI(s, FD.boolvar2fdvar b, FD.EQ, 1); b end
---
> 		in FD.relI(s, FD.Reflect.boolvar2intvar b, FD.EQ, 1); b end
355c355
< 	fun fail(s) = let val b = FD.fdvar(s,#[FD.SINGLE(42)]) in FD.relI(s,b,FD.EQ,57) end
---
> 	fun fail(s) = let val b = FD.intvar(s,#[FD.SINGLE(42)]) in FD.relI(s,b,FD.EQ,57) end
358c358
< 	| postClause (s,t) clause = FD.bool_orV(s, Vector.fromList clause, t) 
---
> 	| postClause (s,t) clause = FD.disjV(s, Vector.fromList clause, t) 
diff -r -x CVS -I '\*[ ]*\$' gecodeHead/interfaces/alice/Makefile gecode/interfaces/alice/Makefile
2a3,4
> INSTALLTO=`alice-config --alicelibdir`/gecode
> 
13a16,17
> 	FS-sig.stc \
> 	FS.stc \
25,72c29,46
< 	generic/kernel.o \
< 	generic/memory-manager.o \
< 	generic/statistics.o \
< 	generic/relations.o \
< 	generic/prop-heap.o \
< 	generic/search.o \
< 	support/memory.o \
< 	support/scrap-heap.o \
< 	support/memory-chunk.o \
< 	int/bool/not.o \
< 	int/bool/and.o \
< 	int/bool/or.o \
< 	int/bool/imp.o \
< 	int/bool/xor.o \
< 	int/bool/eq.o \
< 	int/bool/post.o \
< 	int/distinct/post.o \
< 	int/rel/eq-nq.o \
< 	int/rel/lq-le.o \
< 	int/rel/dom.o \
< 	int/rel/element-int.o \
< 	int/rel/element-var.o \
< 	int/rel/lex.o \
< 	int/rel/post.o \
< 	int/count/rel.o \
< 	int/count/post.o \
< 	int/combinators/select.o \
< 	int/combinators/post.o \
< 	int/arithmetic/abs.o \
< 	int/arithmetic/minmax.o \
< 	int/arithmetic/mult.o \
< 	int/arithmetic/post.o \
< 	int/arithmetic/power.o \
< 	int/linear/novar.o \
< 	int/linear/preprocess.o \
< 	int/linear/supportset.o \
< 	int/linear/post.o \
< 	int/linear/post-01.o \
< 	int/linear/boolean.o \
< 	int/var.o \
< 	int/var/rangelist.o \
< 	int/var/domain.o \
< 	int/var/dom-spec.o \
< 	int/var/core.o \
< 	int/var/print.o \
< 	int/branching/branch.o \
< 	int/branching/assign.o \
< 	int/branching/posvaldesc.o
---
> 	generic/kernel.o generic/memory-manager.o generic/statistics.o \
> 	generic/relations.o generic/prop-heap.o search/best.o search/bab.o \
> 	search/dfs.o search/plain.o search/null.o support/memory.o \
> 	support/scrap-heap.o support/memory-chunk.o int/bool/not.o \
> 	int/bool/and.o int/bool/or.o int/bool/imp.o int/bool/xor.o \
> 	int/bool/eq.o int/bool/post.o int/distinct/post.o int/rel/eq-nq.o \
> 	int/rel/lq-le.o int/rel/dom.o int/rel/element-int.o int/rel/element-var.o \
> 	int/rel/lex.o int/rel/post.o int/count/rel.o int/count/post.o \
> 	int/combinators/select.o int/combinators/post.o int/arithmetic/abs.o \
> 	int/arithmetic/minmax.o int/arithmetic/mult.o int/arithmetic/power.o \
> 	int/arithmetic/post.o int/linear/novar.o int/linear/preprocess.o \
> 	int/linear/supportset.o int/linear/post.o int/linear/post-01.o \
> 	int/linear/boolean.o int/var.o int/var/rangelist.o int/var/domain.o \
> 	int/var/dom-spec.o int/var/core.o int/var/print.o int/branching/branch.o \
> 	int/branching/assign.o int/branching/posvaldesc.o fs/nonbasic/propagators.o \
> 	fs/nonbasic/post.o fs/var.o fs/var/core.o fs/branching/branch.o \
> 	fs/int/propagators.o fs/int/post.o fs/select/propagators.o \
> 	fs/select/post.o fs/reified/propagators.o fs/reified/post.o
74c48,49
< CXXFLAGS=-O2 -Dforceinline=inline -DNDEBUG -pipe
---
> #CXXFLAGS=-O2 -Dforceinline=inline -DNDEBUG -pipe
> CXXFLAGS=-Dforceinline=inline -pipe -g
81c56
< 	alicetool compile $(EXTRA_INCLUDES) $(CXXFLAGS) \
---
> 	alicetool -v compile $(EXTRA_INCLUDES) $(CXXFLAGS) \
85c60
< 	alicetool link $(LDFLAGS) $(SOURCES:%.cc=%.o) $(GECODEOBJ:%=../../%) \
---
> 	alicetool -v link -g $(LDFLAGS) $(SOURCES:%.cc=%.o) $(GECODEOBJ:%=../../%) \
105a81,84
> install: all
> 	install -d $(INSTALLTO)
> 	install $(NATIVES:%=%.dll) $(TARGETS) $(INSTALLTO)
> 
diff -r -x CVS -I '\*[ ]*\$' gecodeHead/interfaces/alice/Search.aml gecode/interfaces/alice/Search.aml
40c40
< 	    fun dfe s =
---
> 	    fun dfe depth s =
50,51c50,51
< 			dfe s;
< 			dfe c
---
> 			dfe (depth+1) s;
> 			dfe (depth+1) c
54c54
< 	    (dfe (Space.clone s); NONE) handle (Found s) => SOME s
---
> 	    (dfe 0 (Space.clone s); NONE) handle (Found s) => SOME s
diff -r -x CVS -I '\*[ ]*\$' gecodeHead/interfaces/alice/Space.aml gecode/interfaces/alice/Space.aml
22c22
<     open UnsafeGecode
---
>     open UnsafeGecode.UnsafeGecodeBase
diff -r -x CVS -I '\*[ ]*\$' gecodeHead/interfaces/alice/UnsafeGecode.asig gecode/interfaces/alice/UnsafeGecode.asig
14,94c14,143
<    sig
<        structure UnsafeGecode : sig
< 	   exception InvalidSpace
< 	   exception InvalidVar
< 
< 	   val makeSpace : unit -> 'space
< 
< 	   val fdvar : 'space * (int * int) vector -> 'fdvar
< 	   val fdvarR : 'space * (int * int) vector * 'boolvar -> 'fdvar
< 	   val boolvar : 'space -> 'boolvar
< 
< 	   val getMin : 'space * 'fdvar -> int
< 	   val getMax : 'space * 'fdvar -> int
< 
< 	   val distinct : 'space * 'fdvar vector * 'conlevel -> unit
< 	   val distinctI : 'space * (int * 'fdvar) vector * 'conlevel -> unit
< 
< 	   val countII : 'space * 'fdvar vector * 'relation *
< 			 int * 'relation * int -> unit
< 	   val countVI : 'space * 'fdvar vector * 'relation *
< 			 'fdvar * 'relation * int -> unit
< 	   val countIV : 'space * 'fdvar vector * 'relation *
< 			 int * 'relation * 'fdvar -> unit
< 	   val countVV : 'space * 'fdvar vector * 'relation *
< 			 'fdvar * 'relation * 'fdvar -> unit
< 
< 	   val element : 'space * 'fdvar vector * 'fdvar * 'fdvar -> unit
< 	   val elementI : 'space * int vector * 'fdvar * 'fdvar -> unit
< 	   val lex : 'space * 'fdvar vector * 'relation *
< 		     'fdvar vector -> unit
< 
< 	   val dom : 'space * 'intvar * (int * int) vector -> unit
< 	   val domR : 'space * 'intvar * (int * int) vector * 'boolvar -> unit
< 
< 	   val rel : 'space * 'fdvar * 'relation * 'fdvar -> unit
< 	   val relI : 'space * 'fdvar * 'relation * 'int -> unit
< 	   val relR : 'space * 'fdvar * 'relation * 'fdvar * 'boolvar -> unit
< 	   val relIR : 'space * 'fdvar * 'relation * 'int * 'boolvar -> unit
< 	   val eq : 'space * 'fdvar * 'fdvar * 'conlevel -> unit
< 	   val eqV : 'space * 'fdvar vector * 'conlevel -> unit
< 	   val eqR : 'space * 'fdvar * 'fdvar * 'boolvar * 'conlevel -> unit
< 	   val eqVR : 'space * 'fdvar vector * 'boolvar * 'conlevel -> unit
< 
< 	   val linear : 'space * (int * 'fdvar) vector * 'relation * 
< 			int * 'conlevel -> unit
< 	   val linearR : 'space * (int * 'fdvar) vector * 'relation * 
< 			 int * 'boolvar * 'conlevel -> unit
< 
< 	   val min : 'space * 'fdvar vector * 'fdvar -> unit
< 	   val max : 'space * 'fdvar vector * 'fdvar -> unit
< 	   val abs : 'space * 'fdvar * 'fdvar * 'conlevel -> unit
< 	   val mult: 'space * 'fdvar * 'fdvar * 'fdvar -> unit
< 	   val power: 'space * 'fdvar * 'fdvar * 'fdvar -> unit
< 
< 	   val bool_not : 'space * 'boolvar * 'boolvar -> unit
< 	   val bool_and : 'space * 'boolvar * 'boolvar * 'boolvar -> unit
< 	   val bool_or  : 'space * 'boolvar * 'boolvar * 'boolvar -> unit
< 	   val bool_imp : 'space * 'boolvar * 'boolvar * 'boolvar -> unit
< 	   val bool_eq  : 'space * 'boolvar * 'boolvar * 'boolvar -> unit
< 	   val bool_xor : 'space * 'boolvar * 'boolvar * 'boolvar -> unit
< 	   val bool_andV: 'space * 'boolvar vector * 'boolvar -> unit
< 	   val bool_orV : 'space * 'boolvar vector * 'boolvar -> unit
< 
< 	   val branch : 'space * 'fdvar vector * 
< 			'b_var_sel * 'b_val_sel -> unit
< 
< 	   val assign : 'space * 'fdvar vector * 'avalsel -> unit
< 
< 	   val fail : 'space -> unit
< 
< 	   val status  : 'space -> 'status
< 	   val commit  : 'space * int -> unit
< 	   val clone   : 'space -> 'space
< 	   val discard : 'space -> unit
< 	   val alive   : 'space -> unit
< 
< 	   val stamps : 'space -> int * int
< 	   val varStamp : 'var -> int
< 
<        end
<    end
\ No newline at end of file
---
> sig
>     structure UnsafeGecode : sig
> 	structure UnsafeGecodeBase : sig
> 	    exception InvalidSpace
> 	    exception InvalidVar
> 		      
> 	    val makeSpace : unit -> 'space
> 				    
> 	    val fail : 'space -> unit
> 				 
> 	    val status  : 'space -> 'status
> 	    val commit  : 'space * int -> unit
> 	    val clone   : 'space -> 'space
> 	    val discard : 'space -> unit
> 	    val alive   : 'space -> unit
> 				    
> 	    val stamps : 'space -> int * int
> 	    val varStamp : 'var -> int
> 	end
> 
> 	structure UnsafeGecodeFD : sig
> 	    val intvar : 'space * (int * int) vector -> 'intvar
> 	    val intvarR : 'space * (int * int) vector * 'boolvar -> 'intvar
> 	    val boolvar : 'space -> 'boolvar
> 				    
> 	    val getMin : 'space * 'intvar -> int
> 	    val getMax : 'space * 'intvar -> int
> 
> 	    val distinct : 'space * 'intvar vector * 'conlevel -> unit
> 	    val distinctOffset : 'space * (int * 'intvar) vector * 'conlevel -> unit
> 
> 	    val countII : 'space * 'intvar vector * 'relation *
> 			  int * 'relation * int -> unit
> 	    val countVI : 'space * 'intvar vector * 'relation *
> 			  'intvar * 'relation * int -> unit
> 	    val countIV : 'space * 'intvar vector * 'relation *
> 			  int * 'relation * 'intvar -> unit
> 	    val countVV : 'space * 'intvar vector * 'relation *
> 			  'intvar * 'relation * 'intvar -> unit
> 
> 	    val element : 'space * 'intvar vector * 'intvar * 'intvar -> unit
> 	    val elementI : 'space * int vector * 'intvar * 'intvar -> unit
> 	    val lex : 'space * 'intvar vector * 'relation *
> 		      'intvar vector -> unit
> 
> 	    val dom : 'space * 'intvar * (int * int) vector -> unit
> 	    val domR : 'space * 'intvar * (int * int) vector * 'boolvar -> unit
> 
> 	    val rel : 'space * 'intvar * 'relation * 'intvar -> unit
> 	    val relI : 'space * 'intvar * 'relation * 'int -> unit
> 	    val relR : 'space * 'intvar * 'relation * 'intvar * 'boolvar -> unit
> 	    val relIR : 'space * 'intvar * 'relation * 'int * 'boolvar -> unit
> 	    val equal : 'space * 'intvar * 'intvar * 'conlevel -> unit
> 	    val equalV : 'space * 'intvar vector * 'conlevel -> unit
> 	    val equalR : 'space * 'intvar * 'intvar * 'boolvar * 'conlevel -> unit
> 	    val equalVR : 'space * 'intvar vector * 'boolvar * 'conlevel -> unit
> 
> 	    val linear : 'space * (int * 'intvar) vector * 'relation * 
> 			 int * 'conlevel -> unit
> 	    val linearR : 'space * (int * 'intvar) vector * 'relation * 
> 			  int * 'boolvar * 'conlevel -> unit
> 
> 	    val min : 'space * 'intvar vector * 'intvar -> unit
> 	    val max : 'space * 'intvar vector * 'intvar -> unit
> 	    val abs : 'space * 'intvar * 'intvar * 'conlevel -> unit
> 	    val mult: 'space * 'intvar * 'intvar * 'intvar -> unit
> 	    val power: 'space * 'intvar * 'intvar * 'intvar -> unit
> 
> 	    val nega : 'space * 'boolvar * 'boolvar -> unit
> 	    val conj : 'space * 'boolvar * 'boolvar * 'boolvar -> unit
> 	    val disj  : 'space * 'boolvar * 'boolvar * 'boolvar -> unit
> 	    val impl : 'space * 'boolvar * 'boolvar * 'boolvar -> unit
> 	    val equi  : 'space * 'boolvar * 'boolvar * 'boolvar -> unit
> 	    val exor : 'space * 'boolvar * 'boolvar * 'boolvar -> unit
> 	    val conjV: 'space * 'boolvar vector * 'boolvar -> unit
> 	    val disjV : 'space * 'boolvar vector * 'boolvar -> unit
> 
> 	    val branch : 'space * 'intvar vector * 
> 			 'b_var_sel * 'b_val_sel -> unit
> 
> 	    val assign : 'space * 'intvar vector * 'avalsel -> unit
> 	end
> 
> 	structure UnsafeGecodeFS : sig
>             val setvar : 'space -> 'setvar
> 
> 	    val lowerBound : 'space * 'setvar * int vector -> unit
> 	    val upperBound : 'space * 'setvar * int vector -> unit
> 	    val incl : 'space * 'intvar * 'setvar -> unit
> 	    val excl : 'space * 'intvar * 'setvar -> unit
> 	    val the : 'space * 'intvar * 'setvar -> unit
> 	    val card : 'space * 'setvar * 'intvar -> unit
> 	    val cardRange : 'space * int * int * 'setvar -> unit
> 	    val superOfInter : 'space * 'setvar * 'setvar * 'setvar -> unit
> 	    val subOfUnion : 'space * 'setvar * 'setvar * 'setvar -> unit
> 	    val compl : 'space * 'setvar * 'setvar -> unit
> 	    val difference : 'space * 'setvar * 'setvar * 'setvar -> unit
> 	    val intersect : 'space * 'setvar * 'setvar * 'setvar -> unit
> 	    val intersectN : 'space * 'setvar vector * 'setvar -> unit
> 	    val union : 'space * 'setvar * 'setvar * 'setvar -> unit
> 	    val unionN : 'space * 'setvar vector * 'setvar -> unit
> 	    val subset : 'space * 'setvar * 'setvar -> unit
> 	    val disjoint : 'space * 'setvar * 'setvar -> unit
> 	    val partition : 'space * 'setvar * 'setvar * 'setvar -> unit
> 	    val partitionN : 'space * 'setvar vector * 'setvar -> unit
> 
> 	    val universal : 'space -> 'setvar
> 	    val is : 'space * 'setvar -> bool
> 
> 	    val inclR : 'space * 'intvar * 'setvar * 'boolvar -> unit
> 	    val isInR : 'space * int * 'setvar * 'boolvar -> unit
> 
> 	    val selectSetvar : 'space * 'setvar * 'setvar vector * 'intvar -> unit
> 	    val selectUnion : 'space * 'setvar * 'setvar vector * 'setvar -> unit
> 	    val selectInter : 'space * 'setvar * 'setvar vector * 'setvar -> unit
> 
> 	    val getUpperBound : 'space * 'setvar -> (int*int) vector
> 	    val getLowerBound : 'space * 'setvar -> (int*int) vector
> 	    val getCard : 'space * 'setvar -> (int * int)
> 	    val getUnknown : 'space * 'setvar -> (int*int) vector
> 	    val getCardOfLowerBound : 'space * 'setvar -> int
> 	    val getCardOfUpperBound : 'space * 'setvar -> int
> 	    val getCardOfUnknown : 'space * 'setvar -> int
> 
> 	    val setvarbranch : 'space * 'setvar vector * 
> 			       'fsb_var_sel * 'fsb_val_sel -> unit
>             val print : 'space * 'setvar -> unit
> 	end
>     end
> end
\ No newline at end of file
diff -r -x CVS -I '\*[ ]*\$' gecodeHead/interfaces/alice/UnsafeGecode.cc gecode/interfaces/alice/UnsafeGecode.cc
40a41,42
> #define DBGMSG(m)
> 
42c44
< //  fprintf(stderr, m); fprintf(stderr, "\n"); }
---
> // fprintf(stderr, m); fprintf(stderr, "\n"); }
44d45
< #define DBGMSG(m)
46c47,51
< #define RETURN_IPAIR(i,j) RETURN2(Store::IntToWord(i), Store::IntToWord(j));
---
> #define RETURN_IPAIR(i,j)        \
> {Tuple *t = Tuple::New(2);       \
>  t->Init(0,Store::IntToWord(i)); \
>  t->Init(1,Store::IntToWord(j)); \
>  RETURN(t->ToWord()); }
91a97,120
>   class VectorValIterator {
>   private:
>     Vector *v;
>     u_int pos;
>     u_int size;
>   public:
>     VectorValIterator(Vector *vv) : v(vv), pos(0), size(v->GetLength()) {}
> 
>     void operator++(void);
>     bool operator()(void) const;
>     int val(void) const;
>   };
> 
>   void VectorValIterator::operator++(void) {
>     pos++;
>   }
>   
>   bool VectorValIterator::operator()(void) const {
>     return pos<size; 
>   }
> 
>   int VectorValIterator::val(void) const {
>     return Store::DirectWordToInt(v->Sub(pos));
>   }
125a155,167
> const FSBvarSel int2fsbvarsel[] =
>   {
>     FSBVAR_MAX_CARD,
>     FSBVAR_MIN_CARD,
>     FSBVAR_NONE
>   };
> 
> const FSBvalSel int2fsbvalsel[] =
>   {
>     FSBVAL_MAX,
>     FSBVAL_MIN
>   };
> 
680a723
>   DBGMSG("commit");
698c741,747
<   cr->Init(0, Store::UnmanagedPointerToWord(s->clone()));
---
> 
>   Space *newSpace = s->clone();
> 
>   CHECK_SPACE(newSpace);
>   DBGMSG("clone successful");
> 
>   cr->Init(0, Store::UnmanagedPointerToWord(newSpace));
701a751,752
> 
> 
1014a1066,1679
> 
> DEFINE1(gc_fsvar) {
>   DBGMSG("gc_fsvar");
>   DECLARE_SPACE(s, stamp, pstamp, x0);
>   CHECK_SPACE(s);
>   
>   if (stamp==-1) stamp=pstamp;
> 
>   int newVar = s->AddFSVariable();
>   DBGMSG("done");
>   RETURN_IPAIR(newVar,stamp);
> } END
> 
> DEFINE2(gc_fsUB) {
>   DBGMSG("fsUB");
>   DECLARE_SPACE(s, stamp, pstamp, x0);
>   CHECK_SPACE(s);
> 
>   DECLARE_VAR(var, stamp, pstamp, x1);
>   DBGMSG("done");
> 
>   unsigned int ubsize = 0;
>   for(RangesRangeList ubs = s->fs_upperBound(var);
>       ubs(); ++ubs) ubsize++;
> 
>   RangesRangeList ub = s->fs_upperBound(var);
>   Vector *v = 
>     Vector::New(ubsize);
>   if(ubsize>0) {
>     u_int count = 0;
>     for (; ub(); ++ub) {
>       Tuple *t = Tuple::New(2);
>       t->Init(0, Store::IntToWord(ub.min()));
>       t->Init(1, Store::IntToWord(ub.max()));
>       v->Init(count, t->ToWord());
>       count++;
>     }
>   }
> 
>   RETURN(v->ToWord());
> } END
> 
> DEFINE2(gc_fsLB) {
>   DBGMSG("fsLB");
>   DECLARE_SPACE(s, stamp, pstamp, x0);
>   CHECK_SPACE(s);
> 
>   DECLARE_VAR(var, stamp, pstamp, x1);
>   DBGMSG("done");
> 
>   unsigned int lbsize = 0;
>   for(RangesRangeList lbs = s->fs_lowerBound(var);
>       lbs(); ++lbs) lbsize++;
> 
>   RangesRangeList lb = s->fs_lowerBound(var);
>   Vector *v = 
>     Vector::New(lbsize);
> 
>   if(lbsize>0) {
>     u_int count = 0;
>     for (; lb(); ++lb) {
>       Tuple *t = Tuple::New(2);
>       t->Init(0, Store::IntToWord(lb.min()));
>       t->Init(1, Store::IntToWord(lb.max()));
>       v->Init(count, t->ToWord());
>       count++;
>     }
>   }
> 
>   RETURN(v->ToWord());
> } END
> 
> DEFINE2(gc_fsUnknown) {
>   DBGMSG("fsLB");
>   DECLARE_SPACE(s, stamp, pstamp, x0);
>   CHECK_SPACE(s);
> 
>   DECLARE_VAR(var, stamp, pstamp, x1);
>   DBGMSG("done");
> 
>   RangesMinus<RangesRangeList, RangesRangeList> unknown =
>     s->fs_unknown(var);
>   RangesCache<RangesMinus<RangesRangeList, RangesRangeList> >
>     unknownC(unknown);
> 
>   unsigned int usize = 0;
>   for(;unknownC(); ++unknownC) usize++;
> 
>   Vector *v = 
>     Vector::New(usize);
>   unknownC.reset();
> 
>   if(usize>0) {
>     u_int count = 0;
>     for (; unknownC(); ++unknownC) {
>       Tuple *t = Tuple::New(2);
>       t->Init(0, Store::IntToWord(unknownC.min()));
>       t->Init(1, Store::IntToWord(unknownC.max()));
>       v->Init(count, t->ToWord());
>       count++;
>     }
>   }
> 
>   RETURN(v->ToWord());
> } END
> 
> DEFINE2(gc_fsGetCard) {
>   DBGMSG("fsGetCard");
>   DECLARE_SPACE(s, stamp, pstamp, x0);
>   CHECK_SPACE(s);
> 
>   DECLARE_VAR(var, stamp, pstamp, x1);
>   DBGMSG("done");
>   RETURN_IPAIR(s->fs_cardinalityMin(var),
> 	       s->fs_cardinalityMax(var));
> } END
> 
> DEFINE2(gc_fsGetCardLB) {
>   DBGMSG("fsGetCardLB");
>   DECLARE_SPACE(s, stamp, pstamp, x0);
>   CHECK_SPACE(s);
> 
>   DECLARE_VAR(var, stamp, pstamp, x1);
>   DBGMSG("done");
> 
>   RETURN_INT(s->fs_lowerBoundSize(var));
> } END
> 
> DEFINE2(gc_fsGetCardUB) {
>   DBGMSG("fsGetCardUB");
>   DECLARE_SPACE(s, stamp, pstamp, x0);
>   CHECK_SPACE(s);
> 
>   DECLARE_VAR(var, stamp, pstamp, x1);
>   DBGMSG("done");
> 
>   RETURN_INT(s->fs_upperBoundSize(var));
> } END
> 
> DEFINE2(gc_fsGetCardUnknown) {
>   DBGMSG("fsGetCardUnknown");
>   DECLARE_SPACE(s, stamp, pstamp, x0);
>   CHECK_SPACE(s);
> 
>   DECLARE_VAR(var, stamp, pstamp, x1);
>   DBGMSG("done");
> 
>   RangesMinus<RangesRangeList, RangesRangeList> unknown =
>     s->fs_unknown(var);
> 
>   RETURN_INT(iteratorSize(unknown));
> } END
> 
> DEFINE3(gc_fsLowerBound) {
>   DBGMSG("fsLowerBound");
>   DECLARE_SPACE(s, stamp, pstamp, x0);
>   CHECK_SPACE(s);
> 
>   DECLARE_VAR(var1, stamp, pstamp, x1);
> 
>   DECLARE_VECTOR(v, x2);
>   int setSize = v->GetLength();
> 
>   // Request all futures so that we can iterate over the vector
>   for (int i=setSize; i--;) {
>     DECLARE_INT(tmp, v->Sub(i));
>   }
> 
>   UnsafeGecode::VectorValIterator is(v);
>   ValuesToRanges<UnsafeGecode::VectorValIterator> is2(is);
>   s->fs_lowerBound(var1, is2);
>   
>   DBGMSG("done");
>   RETURN_UNIT;
> } END
> 
> DEFINE3(gc_fsUpperBound) {
>   DBGMSG("fsUpperBound");
>   DECLARE_SPACE(s, stamp, pstamp, x0);
>   CHECK_SPACE(s);
> 
>   DECLARE_VAR(var1, stamp, pstamp, x1);
> 
>   DECLARE_VECTOR(v, x2);
>   int setSize = v->GetLength();
> 
>   // Request all futures so that we can iterate over the vector
>   for (int i=setSize; i--;) {
>     DECLARE_INT(tmp, v->Sub(i));
>   }
> 
>   UnsafeGecode::VectorValIterator is(v);
>   ValuesToRanges<UnsafeGecode::VectorValIterator> is2(is);
>   s->fs_upperBound(var1, is2);
> 
>   DBGMSG("done");
>   RETURN_UNIT;
> } END
> 
> DEFINE3(gc_fsInclude) {
>   DBGMSG("fsInclude");
>   DECLARE_SPACE(s, stamp, pstamp, x0);
>   CHECK_SPACE(s);
> 
>   DECLARE_VAR(var1, stamp, pstamp, x1);
>   DECLARE_VAR(var2, stamp, pstamp, x2);
>   DBGMSG("done");
>   s->fs_include(var1, var2);
>   RETURN_UNIT;
> } END
> 
> DEFINE3(gc_fsExclude) {
>   DBGMSG("fsExclude");
>   DECLARE_SPACE(s, stamp, pstamp, x0);
>   CHECK_SPACE(s);
> 
>   DECLARE_VAR(var1, stamp, pstamp, x1);
>   DECLARE_VAR(var2, stamp, pstamp, x2);
>   DBGMSG("done");
>   s->fs_exclude(var1, var2);
>   RETURN_UNIT;
> } END
> 
> DEFINE3(gc_fsThe) {
>   DBGMSG("fsThe");
>   DECLARE_SPACE(s, stamp, pstamp, x0);
>   CHECK_SPACE(s);
> 
>   DECLARE_VAR(var1, stamp, pstamp, x1);
>   DECLARE_VAR(var2, stamp, pstamp, x2);
>   DBGMSG("done");
>   s->fs_the(var1, var2);
>   RETURN_UNIT;
> } END
> 
> DEFINE3(gc_fsCard) {
>   DBGMSG("fsCard");
>   DECLARE_SPACE(s, stamp, pstamp, x0);
>   CHECK_SPACE(s);
> 
>   DECLARE_VAR(var1, stamp, pstamp, x1);
>   DECLARE_VAR(var2, stamp, pstamp, x2);
>   DBGMSG("done");
>   s->fs_card(var1, var2);
>   RETURN_UNIT;
> } END
> 
> DEFINE4(gc_fsCardRange) {
>   DBGMSG("fsCardRange");
>   DECLARE_SPACE(s, stamp, pstamp, x0);
>   CHECK_SPACE(s);
> 
>   DECLARE_INT(min, x1);
>   DECLARE_INT(max, x2);
>   DECLARE_VAR(var1, stamp, pstamp, x3);
> 
>   DBGMSG("done");
>   s->fs_cardRange(var1, min, max);
>   RETURN_UNIT;
> } END
> 
> DEFINE4(gc_fsSuperOfInter) {
>   DBGMSG("fsSuperOfInter");
>   DECLARE_SPACE(s, stamp, pstamp, x0);
>   CHECK_SPACE(s);
> 
>   DECLARE_VAR(var1, stamp, pstamp, x1);
>   DECLARE_VAR(var2, stamp, pstamp, x2);
>   DECLARE_VAR(var3, stamp, pstamp, x3);
> 
>   DBGMSG("done");
>   s->fs_superOfInter(var1, var2, var3);
>   RETURN_UNIT;
> } END
> 
> DEFINE4(gc_fsSubOfUnion) {
>   DBGMSG("fsSubOfUnion");
>   DECLARE_SPACE(s, stamp, pstamp, x0);
>   CHECK_SPACE(s);
> 
>   DECLARE_VAR(var1, stamp, pstamp, x1);
>   DECLARE_VAR(var2, stamp, pstamp, x2);
>   DECLARE_VAR(var3, stamp, pstamp, x3);
> 
>   DBGMSG("done");
>   s->fs_subOfUnion(var1, var2, var3);
>   RETURN_UNIT;
> } END
> 
> DEFINE3(gc_fsSubset) {
>   DBGMSG("fsSubset");
>   DECLARE_SPACE(s, stamp, pstamp, x0);
>   CHECK_SPACE(s);
> 
>   DECLARE_VAR(var1, stamp, pstamp, x1);
>   DECLARE_VAR(var2, stamp, pstamp, x2);
> 
>   DBGMSG("done");
>   s->fs_subset(var1, var2);
>   RETURN_UNIT;
> } END
> 
> DEFINE3(gc_fsDisjoint) {
>   DBGMSG("fsDisjoint");
>   DECLARE_SPACE(s, stamp, pstamp, x0);
>   CHECK_SPACE(s);
> 
>   DECLARE_VAR(var1, stamp, pstamp, x1);
>   DECLARE_VAR(var2, stamp, pstamp, x2);
> 
>   DBGMSG("done");
>   s->fs_disjoint(var1, var2);
>   RETURN_UNIT;
> } END
> 
> DEFINE4(gc_fsUnion) {
>   DBGMSG("fsUnion");
>   DECLARE_SPACE(s, stamp, pstamp, x0);
>   CHECK_SPACE(s);
> 
>   DECLARE_VAR(var1, stamp, pstamp, x1);
>   DECLARE_VAR(var2, stamp, pstamp, x2);
>   DECLARE_VAR(var3, stamp, pstamp, x3);
> 
>   DBGMSG("done");
>   s->fs_union(var1, var2, var3);
>   RETURN_UNIT;
> } END
> 
> DEFINE3(gc_fsComplement) {
>   DBGMSG("fsComplement");
>   DECLARE_SPACE(s, stamp, pstamp, x0);
>   CHECK_SPACE(s);
> 
>   DECLARE_VAR(var1, stamp, pstamp, x1);
>   DECLARE_VAR(var2, stamp, pstamp, x2);
> 
>   DBGMSG("done");
>   s->fs_complement(var1, var2);
>   RETURN_UNIT;
> } END
> 
> DEFINE4(gc_fsIntersection) {
>   DBGMSG("fsIntersection");
>   DECLARE_SPACE(s, stamp, pstamp, x0);
>   DBGMSG("declare done");
>   CHECK_SPACE(s);
>   DBGMSG("check done");
> 
>   DECLARE_VAR(var1, stamp, pstamp, x1);
>   DBGMSG("var 1");
>   DECLARE_VAR(var2, stamp, pstamp, x2);
>   DBGMSG("var 2");
>   DECLARE_VAR(var3, stamp, pstamp, x3);
>   DBGMSG("var 3");
> 
>   DBGMSG("done");
>   s->fs_intersection(var1, var2, var3);
>   RETURN_UNIT;
> } END
> 
> DEFINE4(gc_fsDifference) {
>   DBGMSG("fsDifference");
>   DECLARE_SPACE(s, stamp, pstamp, x0);
>   CHECK_SPACE(s);
> 
>   DECLARE_VAR(var1, stamp, pstamp, x1);
>   DECLARE_VAR(var2, stamp, pstamp, x2);
>   DECLARE_VAR(var3, stamp, pstamp, x3);
> 
>   DBGMSG("done");
>   s->fs_difference(var1, var2, var3);
>   RETURN_UNIT;
> } END
> 
> DEFINE4(gc_fsPartition) {
>   DBGMSG("fsPartition");
>   DECLARE_SPACE(s, stamp, pstamp, x0);
>   CHECK_SPACE(s);
> 
>   DECLARE_VAR(var1, stamp, pstamp, x1);
>   DECLARE_VAR(var2, stamp, pstamp, x2);
>   DECLARE_VAR(var3, stamp, pstamp, x3);
> 
>   DBGMSG("done");
>   s->fs_partition(var1, var2, var3);
>   RETURN_UNIT;
> } END
> 
> DEFINE3(gc_fsUnionN) {
>   DBGMSG("fsUnionN");
>   DECLARE_SPACE(s, stamp, pstamp, x0);
>   CHECK_SPACE(s);
> 
>   DECLARE_VECTOR(v, x1);
>   DECLARE_VAR(var1, stamp, pstamp, x2);
> 
>   int noOfVars = v->GetLength();
> 
>   if (noOfVars==0) RETURN_UNIT;
> 
>   IntArgs vars(noOfVars);
>   for (int i=noOfVars; i--;) {
>     DECLARE_VAR(tmp, stamp, pstamp, v->Sub(i));
>     vars[i] = tmp;
>   }
> 
>   DBGMSG("done");
>   s->fs_unionn(vars, var1);
>   RETURN_UNIT;
> } END
> 
> DEFINE3(gc_fsIntersectionN) {
>   DBGMSG("fsIntersectionN");
>   DECLARE_SPACE(s, stamp, pstamp, x0);
>   CHECK_SPACE(s);
> 
>   DECLARE_VECTOR(v, x1);
>   DECLARE_VAR(var1, stamp, pstamp, x2);
> 
>   int noOfVars = v->GetLength();
> 
>   if (noOfVars==0) RETURN_UNIT;
> 
>   IntArgs vars(noOfVars);
>   for (int i=noOfVars; i--;) {
>     DECLARE_VAR(tmp, stamp, pstamp, v->Sub(i));
>     vars[i] = tmp;
>   }
> 
>   DBGMSG("done");
>   s->fs_intersectionn(vars, var1);
>   RETURN_UNIT;
> } END
> 
> DEFINE3(gc_fsPartitionN) {
>   DBGMSG("fsIntersectionN");
>   DECLARE_SPACE(s, stamp, pstamp, x0);
>   CHECK_SPACE(s);
> 
>   DECLARE_VECTOR(v, x1);
>   DECLARE_VAR(var1, stamp, pstamp, x2);
> 
>   int noOfVars = v->GetLength();
> 
>   if (noOfVars==0) RETURN_UNIT;
> 
>   IntArgs vars(noOfVars);
>   for (int i=noOfVars; i--;) {
>     DECLARE_VAR(tmp, stamp, pstamp, v->Sub(i));
>     vars[i] = tmp;
>   }
> 
>   DBGMSG("done");
>   s->fs_partitionn(vars, var1);
>   RETURN_UNIT;
> } END
> 
> DEFINE1(gc_fsUniversal) {
>   DBGMSG("fsUniversal");
>   DECLARE_SPACE(s, stamp, pstamp, x0);
>   CHECK_SPACE(s);
> 
>   if (stamp==-1) stamp=pstamp;
> 
>   int newVar = s->AddFSVariable();
> 
>   // Creates a new set constant every time!
>   // How should we handle constants?
> 
>   RangesFullSet full;
>   s->fs_upperBound(newVar,full);
>   s->fs_lowerBound(newVar,full);
> 
>   DBGMSG("done");
>   RETURN_IPAIR(newVar,stamp);
> } END
> 
> DEFINE2(gc_fsIs) {
>   DBGMSG("fsUniversal");
>   DECLARE_SPACE(s, stamp, pstamp, x0);
>   CHECK_SPACE(s);
> 
>   DECLARE_VAR(var1, stamp, pstamp, x1);
> 
>   RETURN_BOOL(s->fs_assigned(var1));
> } END
> 
> DEFINE4(gc_fsIncludeR) {
>   DBGMSG("fsIncludeR");
>   DECLARE_SPACE(s, stamp, pstamp, x0);
>   CHECK_SPACE(s);
> 
>   DECLARE_VAR(var1, stamp, pstamp, x1);
>   DECLARE_VAR(var2, stamp, pstamp, x2);
>   DECLARE_VAR(var3, stamp, pstamp, x3);
> 
>   DBGMSG("done");
>   s->fs_includeR(var1, var2, var3);
>   RETURN_UNIT;
> } END
> 
> DEFINE4(gc_fsIncludeRI) {
>   DBGMSG("fsIncludeRI");
>   DECLARE_SPACE(s, stamp, pstamp, x0);
>   CHECK_SPACE(s);
>   DECLARE_INT(i, x1);
>   DECLARE_VAR(var1, stamp, pstamp, x2);
>   DECLARE_VAR(var3, stamp, pstamp, x3);
> 
>   DBGMSG("done");
>   s->fs_includeRI(i, var1, var3);
>   RETURN_UNIT;
> } END
> 
> DEFINE4(gc_fsSelectUnion) {
>   DBGMSG("fsSelectUnion");
>   DECLARE_SPACE(s, stamp, pstamp, x0);
>   CHECK_SPACE(s);
> 
>   DECLARE_VAR(var1, stamp, pstamp, x1);
>   DECLARE_VECTOR(v, x2);
>   DECLARE_VAR(var2, stamp, pstamp, x3);
> 
>   int noOfVars = v->GetLength();
> 
>   if (noOfVars==0) RETURN_UNIT;
> 
>   IntArgs vars(noOfVars);
>   for (int i=noOfVars; i--;) {
>     DECLARE_VAR(tmp, stamp, pstamp, v->Sub(i));
>     vars[i] = tmp;
>   }
> 
>   DBGMSG("done");
>   s->fs_selectUnion(var1, vars, var2);
>   RETURN_UNIT;
> } END
> 
> DEFINE4(gc_fsSelectInter) {
>   DBGMSG("fsSelectInter");
>   DECLARE_SPACE(s, stamp, pstamp, x0);
>   CHECK_SPACE(s);
> 
>   DECLARE_VAR(var1, stamp, pstamp, x1);
>   DECLARE_VECTOR(v, x2);
>   DECLARE_VAR(var2, stamp, pstamp, x3);
> 
>   int noOfVars = v->GetLength();
> 
>   if (noOfVars==0) RETURN_UNIT;
> 
>   IntArgs vars(noOfVars);
>   for (int i=noOfVars; i--;) {
>     DECLARE_VAR(tmp, stamp, pstamp, v->Sub(i));
>     vars[i] = tmp;
>   }
> 
>   DBGMSG("done");
>   s->fs_selectInter(var1, vars, var2);
>   RETURN_UNIT;
> } END
> 
> DEFINE4(gc_fsSelectSets) {
>   DBGMSG("fsSelectSets");
>   DECLARE_SPACE(s, stamp, pstamp, x0);
>   CHECK_SPACE(s);
> 
>   DECLARE_VAR(var1, stamp, pstamp, x1);
>   DECLARE_VECTOR(v, x2);
>   DECLARE_VAR(var2, stamp, pstamp, x3);
> 
>   int noOfVars = v->GetLength();
> 
>   if (noOfVars==0) RETURN_UNIT;
> 
>   IntArgs vars(noOfVars);
>   for (int i=noOfVars; i--;) {
>     DECLARE_VAR(tmp, stamp, pstamp, v->Sub(i));
>     vars[i] = tmp;
>   }
> 
>   DBGMSG("done");
>   s->fs_selectSets(var1, vars, var2);
>   RETURN_UNIT;
> } END
> 
> DEFINE4(gc_fsBranch) {
>   DBGMSG("fsBranch");
>   DECLARE_SPACE(s, stamp, pstamp, x0);
>   CHECK_SPACE(s);
> 
>   DECLARE_VECTOR(v, x1);
>   DECLARE_INT(varsel, x2);
>   DECLARE_INT(valsel, x3);
> 
>   int noOfVars = v->GetLength();
> 
>   if (noOfVars==0) RETURN_UNIT;
> 
>   IntArgs vars(noOfVars);
>   for (int i=noOfVars; i--;) {
>     DECLARE_VAR(tmp, stamp, pstamp, v->Sub(i));
>     vars[i] = tmp;
>   }
> 
>   s->fs_branch(vars, UnsafeGecode::int2fsbvarsel[varsel],
> 	       UnsafeGecode::int2fsbvalsel[valsel]);
> 
>   DBGMSG("done");
> 
>   RETURN_UNIT;
> } END
> 
1027a1693,1696
> DEFINE2(gc_fsPrint) {
>   DBGMSG("fsPrint");
>   DECLARE_SPACE(s, stamp, pstamp, x0);
>   CHECK_SPACE(s);
1029,1033c1698,1705
< word InitComponent() {
<   DBGMSG("init gecode");
<   UnsafeGecode::gecodeFinalizationSet = new UnsafeGecode::GecodeFinalizationSet();
<   UnsafeGecode::gecodeHandler = new UnsafeGecode::GecodeHandler();
<   
---
>   DECLARE_VAR(var1, stamp, pstamp, x1);
> 
>   s->fs_print(var1);
>   RETURN_UNIT;
> } END
> 
> static word UnsafeGecodeBase() {
>   Record *record = Record::New(13);
1036c1708
< 			   "UnsafeGecode.InvalidSpace")->ToWord();
---
> 			   "UnsafeGecode.UnsafeGecodeBase.InvalidSpace")->ToWord();
1041c1713
< 			   "UnsafeGecode.InvalidVar")->ToWord();
---
> 			   "UnsafeGecode.UnsafeGecodeBase.InvalidVar")->ToWord();
1043,1045d1714
< 
<   Record *record = Record::New(54);
< 
1051,1052c1720
< 
<   INIT_STRUCTURE(record, "UnsafeGecode", "makeSpace",
---
>   INIT_STRUCTURE(record, "UnsafeGecode.UnsafeGecodeBase", "makeSpace",
1054c1722,1744
<   INIT_STRUCTURE(record, "UnsafeGecode", "fdvar",
---
>   INIT_STRUCTURE(record, "UnsafeGecode.UnsafeGecodeBase", "fail",
> 		 gc_fail, 1);
>   INIT_STRUCTURE(record, "UnsafeGecode.UnsafeGecodeBase", "status",
> 		 gc_status, 1);
>   INIT_STRUCTURE(record, "UnsafeGecode.UnsafeGecodeBase", "commit",
> 		 gc_commit, 2);
>   INIT_STRUCTURE(record, "UnsafeGecode.UnsafeGecodeBase", "clone",
> 		 gc_clone, 1);
>   INIT_STRUCTURE(record, "UnsafeGecode.UnsafeGecodeBase", "discard",
> 		 gc_discard, 1);
>   INIT_STRUCTURE(record, "UnsafeGecode.UnsafeGecodeBase", "alive",
> 		 gc_alive, 1);
>   INIT_STRUCTURE(record, "UnsafeGecode.UnsafeGecodeBase", "stamps",
> 		 gc_stamps, 1);
>   INIT_STRUCTURE(record, "UnsafeGecode.UnsafeGecodeBase", "varStamp",
> 		 gc_varStamp, 1);
>   return record->ToWord();
> }
> 
> static word UnsafeGecodeFD() {
>   Record *record = Record::New(41);
> 
>   INIT_STRUCTURE(record, "UnsafeGecode.UnsafeGecodeFD", "intvar",
1056c1746
<   INIT_STRUCTURE(record, "UnsafeGecode", "fdvarR",
---
>   INIT_STRUCTURE(record, "UnsafeGecode.UnsafeGecodeFD", "intvarR",
1058c1748
<   INIT_STRUCTURE(record, "UnsafeGecode", "boolvar",
---
>   INIT_STRUCTURE(record, "UnsafeGecode.UnsafeGecodeFD", "boolvar",
1060c1750
<   INIT_STRUCTURE(record, "UnsafeGecode", "getMin",
---
>   INIT_STRUCTURE(record, "UnsafeGecode.UnsafeGecodeFD", "getMin",
1062c1752
<   INIT_STRUCTURE(record, "UnsafeGecode", "getMax",
---
>   INIT_STRUCTURE(record, "UnsafeGecode.UnsafeGecodeFD", "getMax",
1064c1754,1772
<   INIT_STRUCTURE(record, "UnsafeGecode", "dom",
---
>   INIT_STRUCTURE(record, "UnsafeGecode.UnsafeGecodeFD", "distinct",
> 		 gc_distinct, 3);
>   INIT_STRUCTURE(record, "UnsafeGecode.UnsafeGecodeFD", "distinctOffset",
> 		 gc_distincti, 3);
>   INIT_STRUCTURE(record, "UnsafeGecode.UnsafeGecodeFD", "countII",
> 		 gc_countii, 6);
>   INIT_STRUCTURE(record, "UnsafeGecode.UnsafeGecodeFD", "countVI",
> 		 gc_countvi, 6);
>   INIT_STRUCTURE(record, "UnsafeGecode.UnsafeGecodeFD", "countIV",
> 		 gc_countiv, 6);
>   INIT_STRUCTURE(record, "UnsafeGecode.UnsafeGecodeFD", "countVV",
> 		 gc_countvv, 6);
>   INIT_STRUCTURE(record, "UnsafeGecode.UnsafeGecodeFD", "element",
> 		 gc_element, 4);
>   INIT_STRUCTURE(record, "UnsafeGecode.UnsafeGecodeFD", "elementI",
> 		 gc_elementi, 4);
>   INIT_STRUCTURE(record, "UnsafeGecode.UnsafeGecodeFD", "lex",
> 		 gc_lex, 4);
>   INIT_STRUCTURE(record, "UnsafeGecode.UnsafeGecodeFD", "dom",
1066c1774
<   INIT_STRUCTURE(record, "UnsafeGecode", "domR",
---
>   INIT_STRUCTURE(record, "UnsafeGecode.UnsafeGecodeFD", "domR",
1068c1776
<   INIT_STRUCTURE(record, "UnsafeGecode", "rel",
---
>   INIT_STRUCTURE(record, "UnsafeGecode.UnsafeGecodeFD", "rel",
1070c1778
<   INIT_STRUCTURE(record, "UnsafeGecode", "relI",
---
>   INIT_STRUCTURE(record, "UnsafeGecode.UnsafeGecodeFD", "relI",
1072c1780
<   INIT_STRUCTURE(record, "UnsafeGecode", "relR",
---
>   INIT_STRUCTURE(record, "UnsafeGecode.UnsafeGecodeFD", "relR",
1074c1782
<   INIT_STRUCTURE(record, "UnsafeGecode", "relIR",
---
>   INIT_STRUCTURE(record, "UnsafeGecode.UnsafeGecodeFD", "relIR",
1076c1784
<   INIT_STRUCTURE(record, "UnsafeGecode", "eq",
---
>   INIT_STRUCTURE(record, "UnsafeGecode.UnsafeGecodeFD", "equal",
1078c1786
<   INIT_STRUCTURE(record, "UnsafeGecode", "eqV",
---
>   INIT_STRUCTURE(record, "UnsafeGecode.UnsafeGecodeFD", "equalV",
1080c1788
<   INIT_STRUCTURE(record, "UnsafeGecode", "eqR",
---
>   INIT_STRUCTURE(record, "UnsafeGecode.UnsafeGecodeFD", "equalR",
1082c1790
<   INIT_STRUCTURE(record, "UnsafeGecode", "eqVR",
---
>   INIT_STRUCTURE(record, "UnsafeGecode.UnsafeGecodeFD", "equalVR",
1084,1088c1792
<   INIT_STRUCTURE(record, "UnsafeGecode", "distinct",
< 		 gc_distinct, 3);
<   INIT_STRUCTURE(record, "UnsafeGecode", "distinctI",
< 		 gc_distincti, 3);
<   INIT_STRUCTURE(record, "UnsafeGecode", "linear",
---
>   INIT_STRUCTURE(record, "UnsafeGecode.UnsafeGecodeFD", "linear",
1090c1794
<   INIT_STRUCTURE(record, "UnsafeGecode", "linearR",
---
>   INIT_STRUCTURE(record, "UnsafeGecode.UnsafeGecodeFD", "linearR",
1092,1093c1796,1806
< 
<   INIT_STRUCTURE(record, "UnsafeGecode", "bool_not",
---
>   INIT_STRUCTURE(record, "UnsafeGecode.UnsafeGecodeFD", "min",
> 		 gc_min, 3);
>   INIT_STRUCTURE(record, "UnsafeGecode.UnsafeGecodeFD", "max",
> 		 gc_max, 3);
>   INIT_STRUCTURE(record, "UnsafeGecode.UnsafeGecodeFD", "abs",
> 		 gc_abs, 4);
>   INIT_STRUCTURE(record, "UnsafeGecode.UnsafeGecodeFD", "mult",
> 		 gc_mult, 4);
>   INIT_STRUCTURE(record, "UnsafeGecode.UnsafeGecodeFD", "power",
> 		 gc_power, 4);
>   INIT_STRUCTURE(record, "UnsafeGecode.UnsafeGecodeFD", "nega",
1095c1808
<   INIT_STRUCTURE(record, "UnsafeGecode", "bool_and",
---
>   INIT_STRUCTURE(record, "UnsafeGecode.UnsafeGecodeFD", "conj",
1097c1810
<   INIT_STRUCTURE(record, "UnsafeGecode", "bool_or",
---
>   INIT_STRUCTURE(record, "UnsafeGecode.UnsafeGecodeFD", "disj",
1099c1812
<   INIT_STRUCTURE(record, "UnsafeGecode", "bool_imp",
---
>   INIT_STRUCTURE(record, "UnsafeGecode.UnsafeGecodeFD", "impl",
1101c1814
<   INIT_STRUCTURE(record, "UnsafeGecode", "bool_eq",
---
>   INIT_STRUCTURE(record, "UnsafeGecode.UnsafeGecodeFD", "equi",
1103c1816
<   INIT_STRUCTURE(record, "UnsafeGecode", "bool_xor",
---
>   INIT_STRUCTURE(record, "UnsafeGecode.UnsafeGecodeFD", "exor",
1105c1818
<   INIT_STRUCTURE(record, "UnsafeGecode", "bool_andV",
---
>   INIT_STRUCTURE(record, "UnsafeGecode.UnsafeGecodeFD", "conjV",
1107c1820
<   INIT_STRUCTURE(record, "UnsafeGecode", "bool_orV",
---
>   INIT_STRUCTURE(record, "UnsafeGecode.UnsafeGecodeFD", "disjV",
1109,1110c1822
< 
<   INIT_STRUCTURE(record, "UnsafeGecode", "branch",
---
>   INIT_STRUCTURE(record, "UnsafeGecode.UnsafeGecodeFD", "branch",
1111a1824,1828
>   INIT_STRUCTURE(record, "UnsafeGecode.UnsafeGecodeFD", "assign",
> 		 gc_assign, 3);
>   
>   return record->ToWord();
> }
1113,1122c1830,1831
<   INIT_STRUCTURE(record, "UnsafeGecode", "status",
< 		 gc_status, 1);
<   INIT_STRUCTURE(record, "UnsafeGecode", "commit",
< 		 gc_commit, 2);
<   INIT_STRUCTURE(record, "UnsafeGecode", "clone",
< 		 gc_clone, 1);
<   INIT_STRUCTURE(record, "UnsafeGecode", "discard",
< 		 gc_discard, 1);
<   INIT_STRUCTURE(record, "UnsafeGecode", "alive",
< 		 gc_alive, 1);
---
> static word UnsafeGecodeFS() {
>   Record *record = Record::New(36);
1124,1149c1833,1904
<   INIT_STRUCTURE(record, "UnsafeGecode", "countII",
< 		 gc_countii, 6);
<   INIT_STRUCTURE(record, "UnsafeGecode", "countVI",
< 		 gc_countvi, 6);
<   INIT_STRUCTURE(record, "UnsafeGecode", "countIV",
< 		 gc_countiv, 6);
<   INIT_STRUCTURE(record, "UnsafeGecode", "countVV",
< 		 gc_countvv, 6);
<   INIT_STRUCTURE(record, "UnsafeGecode", "element",
< 		 gc_element, 4);
<   INIT_STRUCTURE(record, "UnsafeGecode", "elementI",
< 		 gc_elementi, 4);
<   INIT_STRUCTURE(record, "UnsafeGecode", "lex",
< 		 gc_lex, 4);
<   INIT_STRUCTURE(record, "UnsafeGecode", "min",
< 		 gc_min, 3);
<   INIT_STRUCTURE(record, "UnsafeGecode", "max",
< 		 gc_max, 3);
<   INIT_STRUCTURE(record, "UnsafeGecode", "abs",
< 		 gc_abs, 4);
<   INIT_STRUCTURE(record, "UnsafeGecode", "mult",
< 		 gc_mult, 4);
<   INIT_STRUCTURE(record, "UnsafeGecode", "power",
< 		 gc_power, 4);
<   INIT_STRUCTURE(record, "UnsafeGecode", "assign",
< 		 gc_assign, 3);
---
>   INIT_STRUCTURE(record, "UnsafeGecode.UnsafeGecodeFS", "setvar",
> 		 gc_fsvar, 1);
>   INIT_STRUCTURE(record, "UnsafeGecode.UnsafeGecodeFS", "upperBound",
> 		 gc_fsUpperBound, 3);
>   INIT_STRUCTURE(record, "UnsafeGecode.UnsafeGecodeFS", "lowerBound",
> 		 gc_fsLowerBound, 3);
>   INIT_STRUCTURE(record, "UnsafeGecode.UnsafeGecodeFS", "incl",
> 		 gc_fsInclude, 3);
>   INIT_STRUCTURE(record, "UnsafeGecode.UnsafeGecodeFS", "excl",
> 		 gc_fsExclude, 3);
>   INIT_STRUCTURE(record, "UnsafeGecode.UnsafeGecodeFS", "the",
> 		 gc_fsThe, 3);
>   INIT_STRUCTURE(record, "UnsafeGecode.UnsafeGecodeFS", "card",
> 		 gc_fsCard, 3);
>   INIT_STRUCTURE(record, "UnsafeGecode.UnsafeGecodeFS", "cardRange",
> 		 gc_fsCardRange, 4);
>   INIT_STRUCTURE(record, "UnsafeGecode.UnsafeGecodeFS", "superOfInter",
> 		 gc_fsSuperOfInter, 4);
>   INIT_STRUCTURE(record, "UnsafeGecode.UnsafeGecodeFS", "subOfUnion",
> 		 gc_fsSubOfUnion, 4);
>   INIT_STRUCTURE(record, "UnsafeGecode.UnsafeGecodeFS", "compl",
> 		 gc_fsComplement, 3);
>   INIT_STRUCTURE(record, "UnsafeGecode.UnsafeGecodeFS", "difference",
> 		 gc_fsDifference, 4);
>   INIT_STRUCTURE(record, "UnsafeGecode.UnsafeGecodeFS", "intersect",
> 		 gc_fsIntersection, 4);
>   INIT_STRUCTURE(record, "UnsafeGecode.UnsafeGecodeFS", "intersectN",
> 		 gc_fsIntersectionN, 3);
>   INIT_STRUCTURE(record, "UnsafeGecode.UnsafeGecodeFS", "union",
> 		 gc_fsUnion, 4);
>   INIT_STRUCTURE(record, "UnsafeGecode.UnsafeGecodeFS", "unionN",
> 		 gc_fsUnionN, 3);
>   INIT_STRUCTURE(record, "UnsafeGecode.UnsafeGecodeFS", "subset",
> 		 gc_fsSubset, 3);
>   INIT_STRUCTURE(record, "UnsafeGecode.UnsafeGecodeFS", "disjoint",
> 		 gc_fsDisjoint, 3);
>   INIT_STRUCTURE(record, "UnsafeGecode.UnsafeGecodeFS", "partition",
> 		 gc_fsPartition, 4);
>   INIT_STRUCTURE(record, "UnsafeGecode.UnsafeGecodeFS", "partitionN",
> 		 gc_fsPartitionN, 3);
>   INIT_STRUCTURE(record, "UnsafeGecode.UnsafeGecodeFS", "universal",
> 		 gc_fsUniversal, 1);
>   INIT_STRUCTURE(record, "UnsafeGecode.UnsafeGecodeFS", "is",
> 		 gc_fsIs, 2);
>   INIT_STRUCTURE(record, "UnsafeGecode.UnsafeGecodeFS", "inclR",
> 		 gc_fsIncludeR, 4);
>   INIT_STRUCTURE(record, "UnsafeGecode.UnsafeGecodeFS", "isInR",
> 		 gc_fsIncludeRI, 4);
>   INIT_STRUCTURE(record, "UnsafeGecode.UnsafeGecodeFS", "selectSetVar",
> 		 gc_fsSelectSets, 4);
>   INIT_STRUCTURE(record, "UnsafeGecode.UnsafeGecodeFS", "selectUnion",
> 		 gc_fsSelectUnion, 4);
>   INIT_STRUCTURE(record, "UnsafeGecode.UnsafeGecodeFS", "selectInter",
> 		 gc_fsSelectInter, 4);
>   INIT_STRUCTURE(record, "UnsafeGecode.UnsafeGecodeFS", "getUpperBound",
> 		 gc_fsUB, 2);
>   INIT_STRUCTURE(record, "UnsafeGecode.UnsafeGecodeFS", "getLowerBound",
> 		 gc_fsLB, 2);
>   INIT_STRUCTURE(record, "UnsafeGecode.UnsafeGecodeFS", "getCard",
> 		 gc_fsGetCard, 2);
>   INIT_STRUCTURE(record, "UnsafeGecode.UnsafeGecodeFS", "getUnknown",
> 		 gc_fsUnknown, 2);
>   INIT_STRUCTURE(record, "UnsafeGecode.UnsafeGecodeFS", "getCardOfLowerBound",
> 		 gc_fsGetCardLB, 2);
>   INIT_STRUCTURE(record, "UnsafeGecode.UnsafeGecodeFS", "getCardOfUpperBound",
> 		 gc_fsGetCardUB, 2);
>   INIT_STRUCTURE(record, "UnsafeGecode.UnsafeGecodeFS", "getCardOfUnknown",
> 		 gc_fsGetCardUnknown, 2);
>   INIT_STRUCTURE(record, "UnsafeGecode.UnsafeGecodeFS", "setvarbranch",
> 		 gc_fsBranch, 4);
>   INIT_STRUCTURE(record, "UnsafeGecode.UnsafeGecodeFS", "print",
> 		 gc_fsPrint, 2);
1151,1154c1906,1918
<   INIT_STRUCTURE(record, "UnsafeGecode", "stamps",
< 		 gc_stamps, 1);
<   INIT_STRUCTURE(record, "UnsafeGecode", "varStamp",
< 		 gc_varStamp, 1);
---
>   return record->ToWord();
> }
> 
> word InitComponent() {
>   DBGMSG("init gecode");
>   UnsafeGecode::gecodeFinalizationSet = new UnsafeGecode::GecodeFinalizationSet();
>   UnsafeGecode::gecodeHandler = new UnsafeGecode::GecodeHandler();
>   
>   Record *record = Record::New(3);
> 
>   record->Init("UnsafeGecodeBase$", UnsafeGecodeBase());
>   record->Init("UnsafeGecodeFD$", UnsafeGecodeFD());
>   record->Init("UnsafeGecodeFS$", UnsafeGecodeFS());
1156,1157d1919
<   INIT_STRUCTURE(record, "UnsafeGecode", "fail",
< 		 gc_fail, 1);
diff -r -x CVS -I '\*[ ]*\$' gecodeHead/interfaces/alice/examples.aml gecode/interfaces/alice/examples.aml
13,14c13,14
< 	distinctI(space, v1, cl);
< 	distinctI(space, v2, cl);
---
> 	distinctOffset(space, v1, cl);
> 	distinctOffset(space, v2, cl);
72c72
< 		   (1, boolvar2fdvar (Vector.sub(ful, n))))
---
> 		   (1, Reflect.boolvar2intvar (Vector.sub(ful, n))))
75c75
< 	    relI(s1, sat, GR, getVal(s2, sat))
---
> 	    relI(s1, sat, GR, Reflect.value(s2, sat))
81c81
< 			    linearR(space,
---
> 			    Reified.linear(space,
85c85
< 			    linearR(space,
---
> 			    Reified.linear(space,
89c89
< 			    bool_xor(space,
---
> 			    exor(space,
125c125
< 		 getVal(s2, Vector.sub(k, n-1)))
---
> 		 Reflect.value(s2, Vector.sub(k, n-1)))
diff -r -x CVS -I '\*[ ]*\$' gecodeHead/misc/arith-conf.cc gecode/misc/arith-conf.cc
3,4d2
< #include <limits.h>
< #include <math.h>
7d4
<   long int li = INT_MAX - 1;
12,13d8
<   printf("const int gecode_int_max        =  %ld;\n", li);
<   printf("const int gecode_int_min        = %ld;\n", -li);
16,23d10
< 
<   printf("\n");
< 
<   if ((-17 / 7) == -2)
<     printf("#define INT_RND_TWDS_ZERO\n");
<   if ((-17 / 7) == -3)
<     printf("#define INT_RND_TWDS_INFTY\n");
< 
Only in gecode/search: Makefile.am
diff -r -x CVS -I '\*[ ]*\$' gecodeHead/support/arith-conf.hh gecode/support/arith-conf.hh
1,4c1,3
< const int gecode_int_max        = 2147483646;
< const int gecode_int_min        = -2147483646;
< const double gecode_double_max  = 9007199254740991.000000;
< const double gecode_double_min  = -9007199254740991.000000;
---
> /*
>  * Constants used in arithmetics
>  */
6,7c5,18
< #define INT_RND_TWDS_ZERO
< #define SHIFTS_ARE_SIGNED
---
> #include <limits.h>
> #include <float.h>
> 
> const int gecode_int_max        = INT_MAX-1;
> const int gecode_int_min        = -(INT_MAX-1);
> 
> #if SIZEOF_LONG_LONG_INT*8>=DBL_MANT_DIG+1
> const double gecode_double_max  = (double) ((1ll<<DBL_MANT_DIG)-1);
> const double gecode_double_min  = -(double) ((1ll<<DBL_MANT_DIG)-1);
> #else
> #include "arith-conf-generated.hh"
> #endif
> 
> #if SIZEOF_INT==4
8a20
> #endif
diff -r -x CVS -I '\*[ ]*\$' gecodeHead/support/memory.hh gecode/support/memory.hh
20a21,22
> #include "config.hh"
> 
diff -r -x CVS -I '\*[ ]*\$' gecodeHead/support/sort.hh gecode/support/sort.hh
22a23,24
> #include <config.hh>
> 
