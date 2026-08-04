package com.neoxam.batch;

import java.util.List;
import java.util.stream.Collectors;

/**
 * Génère un rapport de synthèse en texte brut à partir d'une liste de
 * lignes { label, amount }. Portage Java de la fonctionnalité décrite
 * dans specs/rapport-synthese.md (fonction pure côté TypeScript).
 *
 * Le total est calculé via BatchReportService.aggregateTotal() : ce
 * service hérite donc, par choix explicite, du bug #5 connu (dérive
 * flottante sur de grands volumes de lignes) plutôt que de recalculer
 * la somme indépendamment.
 */
public class SynthesisService {

    private static final String TITRE_PAR_DEFAUT = "SYNTHÈSE";
    private static final String SEPARATEUR = "---";

    private final BatchReportService batchReportService = new BatchReportService();

    public String generateSynthesis(List<SynthesisLine> lines) {
        return generateSynthesis(lines, null);
    }

    public String generateSynthesis(List<SynthesisLine> lines, SynthesisOptions options) {
        String title = (options != null && options.getTitle() != null)
                ? options.getTitle()
                : TITRE_PAR_DEFAUT;

        StringBuilder sb = new StringBuilder();
        sb.append("=== ").append(title).append(" ===\n");
        for (SynthesisLine line : lines) {
            sb.append(String.format("%s: %.2f %s", line.getLabel(), line.getAmount(), "€")).append('\n');
        }
        sb.append(SEPARATEUR).append('\n');

        int count = lines.size();
        double total = batchReportService.aggregateTotal(toReportLines(lines));
        double average = count == 0 ? 0.0 : total / count;

        sb.append("Nombre de lignes: ").append(count).append('\n');
        sb.append(String.format("Total: %.2f %s", total, "€")).append('\n');
        sb.append(String.format("Moyenne: %.2f %s", average, "€"));

        return sb.toString();
    }

    private List<ReportLine> toReportLines(List<SynthesisLine> lines) {
        return lines.stream()
                .map(line -> new ReportLine(line.getLabel(), line.getAmount()))
                .collect(Collectors.toList());
    }
}
