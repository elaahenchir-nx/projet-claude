package com.neoxam.batch;

import org.junit.jupiter.api.Test;

import java.util.Collections;
import java.util.List;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertDoesNotThrow;

/**
 * Suite de tests pour SynthesisService, calquée sur les critères
 * d'acceptation de specs/rapport-synthese.md.
 */
class SynthesisServiceTest {

    private final SynthesisService service = new SynthesisService();

    @Test
    void generateSynthesisAvecPlusieursLignesEtTitreParDefaut() {
        List<SynthesisLine> lines = List.of(
                new SynthesisLine("Ventes", 1200.50),
                new SynthesisLine("Services", 340.00)
        );

        String result = service.generateSynthesis(lines);

        String expected = String.join("\n",
                "=== SYNTHÈSE ===",
                "Ventes: 1200.50 €",
                "Services: 340.00 €",
                "---",
                "Nombre de lignes: 2",
                "Total: 1540.50 €",
                "Moyenne: 770.25 €"
        );
        assertEquals(expected, result);
    }

    @Test
    void generateSynthesisAvecListeVideNeLevePasException() {
        List<SynthesisLine> lines = Collections.emptyList();

        String result = assertDoesNotThrow(() -> service.generateSynthesis(lines));

        String expected = String.join("\n",
                "=== SYNTHÈSE ===",
                "---",
                "Nombre de lignes: 0",
                "Total: 0.00 €",
                "Moyenne: 0.00 €"
        );
        assertEquals(expected, result);
    }

    @Test
    void generateSynthesisAvecTitrePersonnalise() {
        List<SynthesisLine> lines = List.of(new SynthesisLine("Ventes", 100.0));

        String result = service.generateSynthesis(lines, new SynthesisOptions("RAPPORT TEST"));

        assertEquals("=== RAPPORT TEST ===", result.split("\n")[0]);
    }
}
