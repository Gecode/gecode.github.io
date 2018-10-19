#include <iostream>
#define forceinline inline
#include "sort.icc"

using namespace std;
using namespace Gecode::Support;

const int SIZE = 21;

class comp {
public:
	bool operator() (int rhs, int lhs) {
		return rhs <= lhs;
		//return rhs < lhs;
	}
};

int main () {
	int * v = new int[SIZE];
	for (int i = 0; i < SIZE; ++i) {
		v[i] = 5;
	}
	
	comp c;
	quicksort(& v[0], SIZE, c);

	cout << "done" << endl;
}