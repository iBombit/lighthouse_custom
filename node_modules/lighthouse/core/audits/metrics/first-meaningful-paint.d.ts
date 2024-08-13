export default FirstMeaningfulPaint;
declare class FirstMeaningfulPaint extends Audit {
    /**
     * @return {Promise<LH.Audit.Product>}
     */
    static audit(): Promise<LH.Audit.Product>;
}
export namespace UIStrings {
    const description: string;
}
import { Audit } from '../audit.js';
//# sourceMappingURL=first-meaningful-paint.d.ts.map