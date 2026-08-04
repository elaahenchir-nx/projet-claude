package com.neoxam.batch;

/**
 * Une ligne { label, amount } destinée au rapport de synthèse.
 * Type dédié et volontairement indépendant de ReportLine : la synthèse
 * doit rester réutilisable sans coupler l'appelant au traitement batch
 * de rapports (voir specs/rapport-synthese.md).
 */
public class SynthesisLine {

    private final String label;
    private final double amount;

    public SynthesisLine(String label, double amount) {
        this.label = label;
        this.amount = amount;
    }

    public String getLabel() {
        return label;
    }

    public double getAmount() {
        return amount;
    }
}
