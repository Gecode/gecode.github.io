#include "graph.hh"
#include <set>
#include <vector>
#include <algorithm>

using namespace Gecode;
using namespace Gecode::Graph;
using namespace std;
int main(int argc, char** argv){
        set<int> s;
        for (int i=0; i<10; i++){
                s.insert(i);
                s.insert(i*3);
        }
        vector<int> v(s.begin(),s.end());
        sort(v.begin(),v.end());
        // pass iterators over a sorted sequence of values 
        StlToGecodeRangeIterator<vector<int>::iterator> i(v.begin(),v.end()); 
        IntSet is1(i);
        cout << is1 << endl;
        // making an other intset and their difference
        StlToGecodeRangeIterator<vector<int>::iterator> i2(v.begin(),v.begin()+10); 
        IntSet is2(i2);
        IntSetRanges ir1(is1);
        IntSetRanges ir2(is2);
        Iter::Ranges::Diff<IntSetRanges, IntSetRanges> diffiter(ir1,ir2);
        IntSet diffset(diffiter);
        cout << diffset << endl;
        
}
