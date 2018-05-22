%%
%% Mapping of GCCAT names to Gecode names
%%
%% Corresponding to Gecode version: 6.0.1
%%
%% Copyright: Christian Schulte <schulte@gecode.org>, 2018
%%
%%  Permission is hereby granted, free of charge, to any person obtaining
%%  a copy of this software and associated documentation files (the
%%  "Software"), to deal in the Software without restriction, including
%%  without limitation the rights to use, copy, modify, merge, publish,
%%  distribute, sublicense, and/or sell copies of the Software, and to
%%  permit persons to whom the Software is furnished to do so, subject to
%%  the following conditions:
%%
%%  The above copyright notice and this permission notice shall be
%%  included in all copies or substantial portions of the Software.
%%
%%  THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND,
%%  EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
%%  MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND
%%  NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE
%%  LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION
%%  OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION
%%  WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
%%

system_version(gecode,'Gecode 6.0.1').

ctr_systems('abs_value',[
  gecode('abs','http://www.gecode.org/doc/6.0.1/reference/group__TaskModelIntArith.html')
]).

ctr_systems('all_equal',[
  gecode('rel','http://www.gecode.org/doc/6.0.1/reference/group__TaskModelIntRelInt.html')
]).

ctr_systems('alldifferent',[
  gecode('distinct','http://www.gecode.org/doc/6.0.1/reference/group__TaskModelIntDistinct.html')
]).

ctr_systems('alldifferent_cst',[
  gecode('distinct','http://www.gecode.org/doc/6.0.1/reference/group__TaskModelIntDistinct.html')
]).

ctr_systems('alldifferent_except_0',[
  gecode('distinct','http://www.gecode.org/doc/6.0.1/reference/group__TaskModelIntDistinct.html')
]).

ctr_systems('among',[
  gecode('count','http://www.gecode.org/doc/6.0.1/reference/group__TaskModelIntCount.html')
]).

ctr_systems('among_seq',[
  gecode('sequence','http://www.gecode.org/doc/6.0.1/reference/group__TaskModelIntSequence.html')
]).

ctr_systems('among_var',[
  gecode('count','http://www.gecode.org/doc/6.0.1/reference/group__TaskModelIntCount.html')
]).

ctr_systems('and',[
  gecode('rel','http://www.gecode.org/doc/6.0.1/reference/group__TaskModelIntRelBool.html')
]).

ctr_systems('arith',[
  gecode('rel','http://www.gecode.org/doc/6.0.1/reference/group__TaskModelIntRelInt.html')
]).

ctr_systems('atleast',[
  gecode('atleast','http://www.gecode.org/doc/6.0.1/reference/group__TaskModelMiniModelIntAlias.html'),
  gecode('count','http://www.gecode.org/doc/6.0.1/reference/group__TaskModelIntCount.html')
]).

ctr_systems('atmost',[
  gecode('atmost','http://www.gecode.org/doc/6.0.1/reference/group__TaskModelMiniModelIntAlias.html'),
  gecode('count','http://www.gecode.org/doc/6.0.1/reference/group__TaskModelIntCount.html')
]).

ctr_systems('bin_packing',[
  gecode('binpacking','http://www.gecode.org/doc/6.0.1/reference/group__TaskModelIntBinPacking.html')
]).

ctr_systems('bin_packing_capa',[
  gecode('binpacking','http://www.gecode.org/doc/6.0.1/reference/group__TaskModelIntBinPacking.html')
]).

ctr_systems('circuit',[
  gecode('circuit','http://www.gecode.org/doc/6.0.1/reference/group__TaskModelIntGraph.html')
]).

ctr_systems('clause_and',[
  gecode('clause','http://www.gecode.org/doc/6.0.1/reference/group__TaskModelIntRelBool.html')
]).

ctr_systems('clause_or',[
  gecode('clause','http://www.gecode.org/doc/6.0.1/reference/group__TaskModelIntRelBool.html')
]).

ctr_systems('count',[
  gecode('count','http://www.gecode.org/doc/6.0.1/reference/group__TaskModelIntCount.html')
]).

ctr_systems('counts',[
  gecode('count','http://www.gecode.org/doc/6.0.1/reference/group__TaskModelIntCount.html')
]).

ctr_systems('cumulative',[
  gecode('cumulative','http://www.gecode.org/doc/6.0.1/reference/group__TaskModelIntScheduling.html')
]).

ctr_systems('cumulatives',[
  gecode('cumulatives','http://www.gecode.org/doc/6.0.1/reference/group__TaskModelIntScheduling.html')
]).

ctr_systems('decreasing',[
  gecode('rel','http://www.gecode.org/doc/6.0.1/reference/group__TaskModelIntRelInt.html')
]).

ctr_systems('diffn',[
  gecode('nooverlap','http://www.gecode.org/doc/6.0.1/reference/group__TaskModelIntGeoPacking.html')
]).

ctr_systems('disjunctive',[
  gecode('unary','http://www.gecode.org/doc/6.0.1/reference/group__TaskModelIntScheduling.html')
]).

ctr_systems('domain',[
  gecode('dom','http://www.gecode.org/doc/6.0.1/reference/group__TaskModelIntDomain.html')
]).

ctr_systems('domain_constraint',[
  gecode('channel','http://www.gecode.org/doc/6.0.1/reference/group__TaskModelIntChannel.html')
]).

ctr_systems('elem',[
  gecode('element','http://www.gecode.org/doc/6.0.1/reference/group__TaskModelIntElement.html')
]).

ctr_systems('element',[
  gecode('element','http://www.gecode.org/doc/6.0.1/reference/group__TaskModelIntElement.html')
]).

ctr_systems('element_matrix',[
  gecode('element','http://www.gecode.org/doc/6.0.1/reference/group__TaskModelMiniModel.html')
]).

ctr_systems('eq',[
  gecode('rel','http://www.gecode.org/doc/6.0.1/reference/group__TaskModelIntRelInt.html')
]).

ctr_systems('eq_set',[
  gecode('rel','http://www.gecode.org/doc/6.0.1/reference/group__TaskModelSetRel.html')
]).

ctr_systems('equivalent',[
  gecode('rel','http://www.gecode.org/doc/6.0.1/reference/group__TaskModelIntRelBool.html')
]).

ctr_systems('exactly',[
  gecode('count','http://www.gecode.org/doc/6.0.1/reference/group__TaskModelIntCount.html'),
  gecode('exactly','http://www.gecode.org/doc/6.0.1/reference/group__TaskModelMiniModelIntAlias.html')
]).

ctr_systems('geq',[
  gecode('rel','http://www.gecode.org/doc/6.0.1/reference/group__TaskModelIntRelInt.html')
]).

ctr_systems('global_cardinality',[
  gecode('count','http://www.gecode.org/doc/6.0.1/reference/group__TaskModelIntCount.html')
]).

ctr_systems('gt',[
  gecode('rel','http://www.gecode.org/doc/6.0.1/reference/group__TaskModelIntRelInt.html')
]).

ctr_systems('imply',[
  gecode('rel','http://www.gecode.org/doc/6.0.1/reference/group__TaskModelIntRelBool.html')
]).

ctr_systems('in',[
  gecode('dom','http://www.gecode.org/doc/6.0.1/reference/group__TaskModelIntDomain.html'),
  gecode('rel','http://www.gecode.org/doc/6.0.1/reference/group__TaskModelSetRel.html')
]).

ctr_systems('in_interval',[
  gecode('dom','http://www.gecode.org/doc/6.0.1/reference/group__TaskModelIntDomain.html')
]).

ctr_systems('in_intervals',[
  gecode('dom','http://www.gecode.org/doc/6.0.1/reference/group__TaskModelIntDomain.html')
]).

ctr_systems('in_relation',[
  gecode('extensional','http://www.gecode.org/doc/6.0.1/reference/group__TaskModelIntExt.html')
]).

ctr_systems('in_set',[
  gecode('dom','http://www.gecode.org/doc/6.0.1/reference/group__TaskModelIntDomain.html'),
  gecode('rel','http://www.gecode.org/doc/6.0.1/reference/group__TaskModelSetRel.html')
]).

ctr_systems('increasing',[
  gecode('rel','http://www.gecode.org/doc/6.0.1/reference/group__TaskModelIntRelInt.html')
]).

ctr_systems('int_value_precede',[
  gecode('precede','http://www.gecode.org/doc/6.0.1/reference/group__TaskModelIntPrecede.html')
]).

ctr_systems('int_value_precede_chain',[
  gecode('precede','http://www.gecode.org/doc/6.0.1/reference/group__TaskModelIntPrecede.html')
]).

ctr_systems('inverse',[
  gecode('channel','http://www.gecode.org/doc/6.0.1/reference/group__TaskModelIntChannel.html')
]).

ctr_systems('inverse_offset',[
  gecode('channel','http://www.gecode.org/doc/6.0.1/reference/group__TaskModelIntChannel.html')
]).

ctr_systems('leq',[
  gecode('rel','http://www.gecode.org/doc/6.0.1/reference/group__TaskModelIntRelInt.html')
]).

ctr_systems('lex',[
  gecode('lex','http://www.gecode.org/doc/6.0.1/reference/group__TaskModelMiniModelIntAlias.html')
]).

ctr_systems('lex_greater',[
  gecode('rel','http://www.gecode.org/doc/6.0.1/reference/group__TaskModelIntRelInt.html')
]).

ctr_systems('lex_greatereq',[
  gecode('rel','http://www.gecode.org/doc/6.0.1/reference/group__TaskModelIntRelInt.html')
]).

ctr_systems('lex_less',[
  gecode('rel','http://www.gecode.org/doc/6.0.1/reference/group__TaskModelIntRelInt.html')
]).

ctr_systems('lex_lesseq',[
  gecode('rel','http://www.gecode.org/doc/6.0.1/reference/group__TaskModelIntRelInt.html')
]).

ctr_systems('link_set_to_booleans',[
  gecode('channel','http://www.gecode.org/doc/6.0.1/reference/group__TaskModelSetConnect.html')
]).

ctr_systems('lt',[
  gecode('rel','http://www.gecode.org/doc/6.0.1/reference/group__TaskModelIntRelInt.html')
]).

ctr_systems('max',[
  gecode('rel','http://www.gecode.org/doc/6.0.1/reference/')
]).

ctr_systems('max_index',[
  gecode('rel','http://www.gecode.org/doc/6.0.1/reference/')
]).

ctr_systems('maximum',[
  gecode('max','http://www.gecode.org/doc/6.0.1/reference/group__TaskModelIntArith.html')
]).

ctr_systems('min',[
  gecode('rel','http://www.gecode.org/doc/6.0.1/reference/')
]).

ctr_systems('min_index',[
  gecode('rel','http://www.gecode.org/doc/6.0.1/reference/')
]).

ctr_systems('minimum',[
  gecode('min','http://www.gecode.org/doc/6.0.1/reference/group__TaskModelIntArith.html')
]).

ctr_systems('nand',[
  gecode('clause','http://www.gecode.org/doc/6.0.1/reference/group__TaskModelIntRelBool.html')
]).

ctr_systems('neq',[
  gecode('rel','http://www.gecode.org/doc/6.0.1/reference/group__TaskModelIntRelInt.html')
]).

ctr_systems('nor',[
  gecode('clause','http://www.gecode.org/doc/6.0.1/reference/group__TaskModelIntRelBool.html')
]).

ctr_systems('not_all_equal',[
  gecode('rel','http://www.gecode.org/doc/6.0.1/reference/group__TaskModelIntRelInt.html')
]).

ctr_systems('not_in',[
  gecode('rel','http://www.gecode.org/doc/6.0.1/reference/group__TaskModelSetRel.html')
]).

ctr_systems('nvalue',[
  gecode('nvalues','http://www.gecode.org/doc/6.0.1/reference/group__TaskModelIntNValues.html')
]).

ctr_systems('nvalues',[
  gecode('nvalues','http://www.gecode.org/doc/6.0.1/reference/group__TaskModelIntNValues.html')
]).

ctr_systems('or',[
  gecode('rel','http://www.gecode.org/doc/6.0.1/reference/group__TaskModelIntRelBool.html')
]).

ctr_systems('roots',[
  gecode('roots','http://www.gecode.org/doc/6.0.1/reference/group__TaskModelMiniModelSetAlias.html')
]).

ctr_systems('scalar_product',[
  gecode('linear','http://www.gecode.org/doc/6.0.1/reference/group__TaskModelIntLI.html')
]).

ctr_systems('set_value_precede',[
  gecode('precede','http://www.gecode.org/doc/6.0.1/reference/group__TaskModelSetPrecede.html')
]).

ctr_systems('sort',[
  gecode('sorted','http://www.gecode.org/doc/6.0.1/reference/group__TaskModelIntSorted.html')
]).

ctr_systems('sort_permutation',[
  gecode('sorted','http://www.gecode.org/doc/6.0.1/reference/group__TaskModelIntSorted.html')
]).

ctr_systems('strictly_decreasing',[
  gecode('rel','http://www.gecode.org/doc/6.0.1/reference/group__TaskModelIntRelInt.html')
]).

ctr_systems('strictly_increasing',[
  gecode('rel','http://www.gecode.org/doc/6.0.1/reference/group__TaskModelIntRelInt.html')
]).

ctr_systems('sum_ctr',[
  gecode('linear','http://www.gecode.org/doc/6.0.1/reference/group__TaskModelIntLI.html')
]).

ctr_systems('sum_set',[
  gecode('weights','http://www.gecode.org/doc/6.0.1/reference/group__TaskModelSetConnect.html')
]).

ctr_systems('xor',[
  gecode('rel','http://www.gecode.org/doc/6.0.1/reference/group__TaskModelIntRelBool.html')
]).

