
const FAMILY_FEE = 30;

function calculateLhc(age, history, hospitalLevel) {
    if (hospitalLevel === "none" || history !== "no") {
        return 0;
    }

    return age > 30 ? (age - 30) * 2 : 0;
}

function calculateQuote(quote, hospitalPrice, extrasPrice) {
    const adults = quote.cover_type === "single" ? 1 : 2;

    const applicants = [
        {
            age: quote.applicant1_age,
            history: quote.applicant1_cover_history
        }
    ];

    if (adults === 2) {
        applicants.push({
            age: quote.applicant2_age,
            history: quote.applicant2_cover_history
        });
    }

    const applicantBreakdown = applicants.map((applicant, index) => {
        const loading = calculateLhc(
            applicant.age,
            applicant.history,
            quote.hospital_cover
        );

        const premium = hospitalPrice * (1 + loading / 100);

        return {
            applicant: index + 1,
            age: applicant.age,
            coverHistory: applicant.history,
            lhcLoadingPercent: loading,
            hospitalPremium: premium
        };
    });

    const hospitalPremium = applicantBreakdown.reduce(
        (sum, applicant) => sum + applicant.hospitalPremium,
        0
    );

    const extrasPremium = extrasPrice * adults;

    const familyFee = quote.cover_type === "family" ? FAMILY_FEE : 0;

    const monthlyPremium =
        hospitalPremium + extrasPremium + familyFee;

    const yearlyBeforeDiscount = monthlyPremium * 12;

    const discount =
        quote.payment_frequency === "yearly"
            ? quote.annual_discount
            : 0;

    const yearlyAfterDiscount =
        yearlyBeforeDiscount * (1 - discount / 100);

    const warnings = applicants
        .map((applicant, index) => {
            if (applicant.history === "not sure") {
                return `Applicant ${index + 1}: Cover history is unknown — LHC loading has not been applied. This quote may be inaccurate.`;
            }
            return null;
        })
        .filter(Boolean);

    return {
        applicants: applicantBreakdown,
        hospitalPremium,
        extrasPremium,
        familyFee,
        monthlyPremium,
        yearlyBeforeDiscount,
        yearlyAfterDiscount,
        annualDiscountPercent: discount,
        finalTotal:
            quote.payment_frequency === "yearly"
                ? yearlyAfterDiscount
                : null,
        warnings,
        lhcStatement:
            "Lifetime Health Cover loading applies only to hospital cover. It does not apply to extras cover."
    };
}

module.exports = calculateQuote;
