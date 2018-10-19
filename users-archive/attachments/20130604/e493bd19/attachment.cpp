// FindConfidenceFormula.cpp : Defines the entry point for the console application.
//

#include <gecode/gist.hh>
#include <gecode/driver.hh>
#include <gecode/int.hh>
#include <gecode/float.hh>
#include <gecode/minimodel.hh>


class XFindConfidenceFormula: public Gecode::Space
{
private:
	static const int NumLevels = 2;
	Gecode::FloatVarArray R, r;
	Gecode::BoolVarArray RightSubtree;

public:
	XFindConfidenceFormula(): R(*this, NumLevels, 0, 1), r(*this, NumLevels, 0, 1), RightSubtree(*this, NumLevels, false, true)
	{
		static const double NodeConfValues[NumLevels] = { 0, 0.44 };

		for (int i = 0; i < NumLevels; i++)
		{
			Gecode::rel(*this, R[i], Gecode::FRT_EQ, Gecode::expr(*this, 1 - r[i]), RightSubtree[i]);
			Gecode::rel(*this, R[i], Gecode::FRT_EQ, r[i], Gecode::expr(*this, !RightSubtree[i]));
		}

		Gecode::LinFloatExpr Product = R[0];
		for (int i = 1; i < NumLevels; i++) 
			Product = Product * R[i];

		for (int i = 0; i < NumLevels; i++) 
			Gecode::rel(*this, Gecode::expr(*this, Gecode::abs((R[i] - Product)/(1 - Product) - NodeConfValues[i])), Gecode::FRT_EQ, 0);

		//for (int i = 1; i < NumLevels; i++)
		//	Gecode::rel(*this, Gecode::abs(r[i - 1] - r[i]) >= 0.01);

		Gecode::rel(*this, r[0] == 0);
		//Gecode::rel(*this, r[1] == 0.8);
		//Gecode::rel(*this, RightSubtree[0] == false);
		//Gecode::rel(*this, RightSubtree[1] == false);

		Gecode::branch(*this, RightSubtree, Gecode::INT_VAR_NONE(), Gecode::INT_VAL_MIN());
		Gecode::branch(*this, R, Gecode::FLOAT_VAR_NONE(), Gecode::FLOAT_VAL_SPLIT_MIN());
		Gecode::branch(*this, r, Gecode::FLOAT_VAR_NONE(), Gecode::FLOAT_VAL_SPLIT_MIN());
	}

	virtual Gecode::Space* copy(bool share)
	{
		return new XFindConfidenceFormula(share, *this);
	}

	XFindConfidenceFormula(bool share, XFindConfidenceFormula& that): Gecode::Space(share, that)
	{
		R.update(*this, share, that.R);
		r.update(*this, share, that.r);
		RightSubtree.update(*this, share, that.RightSubtree);
	}

	virtual void print(std::ostream& out) const
	{
		out << "Right subtree: " << RightSubtree << "\nR: " << R << "\n" << "r: " << r << "\n";
	}
};

int main()
{
	typedef XFindConfidenceFormula Model_t;
	Model_t Model;
	Gecode::Gist::Options options;
	Gecode::Gist::Print<Model_t> printer("Print solution");
	options.inspect.click(&printer);
	Gecode::Gist::dfs(&Model, options);
	return 0;
}