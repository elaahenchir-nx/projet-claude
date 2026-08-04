package com.neoxam.batch;

/**
 * Options de génération du rapport de synthèse (titre personnalisé).
 * Un titre absent ou null fait retomber SynthesisService sur le titre
 * par défaut "SYNTHÈSE".
 */
public class SynthesisOptions {

    private final String title;

    public SynthesisOptions(String title) {
        this.title = title;
    }

    public String getTitle() {
        return title;
    }
}
