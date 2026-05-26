import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "利用規約・プライバシーポリシー・免責事項 | 避難所サポート",
  description:
    "避難所サポート(訓練用ベータ版)の利用規約・プライバシーポリシー・免責事項。",
  robots: { index: true, follow: true },
};

const UPDATED = "2026年5月22日";

export default function PolicyPage() {
  return (
    <main className="min-h-screen bg-slate-50 px-5 py-8 sm:px-8">
      <div className="mx-auto max-w-2xl">
        <header className="mb-8">
          <Link
            href="/"
            className="text-xs text-emerald-700 underline"
          >
            ← トップに戻る
          </Link>
          <h1 className="mt-3 text-2xl font-bold text-slate-900">
            利用規約・プライバシーポリシー・免責事項
          </h1>
          <p className="mt-2 text-xs text-slate-500">
            最終更新: {UPDATED}
          </p>
        </header>

        <section className="mb-10">
          <h2 className="text-lg font-bold text-slate-900">
            1. はじめに(本アプリの位置づけ)
          </h2>
          <div className="mt-3 space-y-3 text-sm leading-relaxed text-slate-700">
            <p>
              「避難所サポート」は、避難所の開設・運営の<strong>訓練を支援する</strong>
              Web アプリの試験版(ベータ版)です。実際の災害時に、本アプリのみを
              頼りに避難所運営を行うことを想定したものではありません。
            </p>
            <p>
              現時点では実名・住所等の入力を前提とした本番運用には対応していません
              (詳細は SECURITY.md をご参照ください)。
              訓練・デモ・教材としてのご利用に限定し、本アプリの内容を確認した上で、
              実際の運用は地域の防災計画・自治体マニュアル・現場の判断に従って
              ください。
            </p>
          </div>
        </section>

        <section className="mb-10">
          <h2 className="text-lg font-bold text-slate-900">
            2. 利用規約
          </h2>
          <div className="mt-3 space-y-3 text-sm leading-relaxed text-slate-700">
            <h3 className="mt-4 font-bold">2.1 利用条件</h3>
            <ul className="ml-5 list-disc space-y-1">
              <li>本アプリは無料で利用できます。</li>
              <li>
                避難所運営の訓練、研修、防災イベント等での利用を想定しています。
              </li>
              <li>
                セッション作成(避難所の開設)は、避難所の運営担当者・防災担当者・
                訓練の主催者の方に限ります。
              </li>
            </ul>

            <h3 className="mt-4 font-bold">2.2 禁止事項</h3>
            <ul className="ml-5 list-disc space-y-1">
              <li>第三者の権利を侵害する行為、誹謗中傷</li>
              <li>意味のないセッションの大量作成、その他サービス運営妨害</li>
              <li>本アプリの内容に基づく医療・法的判断を行うこと</li>
              <li>個人情報・実名・住所・電話番号等の入力</li>
              <li>その他法令・公序良俗に反する行為</li>
            </ul>

            <h3 className="mt-4 font-bold">2.3 サービスの提供範囲</h3>
            <p>
              本アプリは現状有姿(as-is)で提供されます。動作の継続性・正確性・
              特定目的への適合性については保証しません。事前の通知なくサービスの
              変更・停止・終了をすることがあります。
            </p>
          </div>
        </section>

        <section className="mb-10">
          <h2 className="text-lg font-bold text-slate-900">
            3. プライバシーポリシー
          </h2>
          <div className="mt-3 space-y-3 text-sm leading-relaxed text-slate-700">
            <h3 className="mt-4 font-bold">3.1 取得する情報</h3>
            <ul className="ml-5 list-disc space-y-1">
              <li>
                <strong>ニックネーム</strong>(参加者が自由に設定する文字列。
                本名以外を推奨します)
              </li>
              <li>
                <strong>選択した役割</strong>(総務・施設・情報・救護衛生・
                食料物資・要配慮者支援・本部 のいずれか)
              </li>
              <li>
                <strong>各ステップの進捗状況</strong>
                (できた / 困った / スキップ の選択と時刻)
              </li>
              <li>
                <strong>共有タイムラインへの投稿内容</strong>
                (自由記述のテキスト)
              </li>
            </ul>

            <h3 className="mt-4 font-bold">3.2 取得しない情報</h3>
            <ul className="ml-5 list-disc space-y-1">
              <li>実名・住所・電話番号・メールアドレス等の連絡先</li>
              <li>位置情報・カメラ・マイク等のデバイス情報</li>
              <li>第三者サービスのアカウント情報</li>
            </ul>

            <h3 className="mt-4 font-bold">3.3 利用目的</h3>
            <ul className="ml-5 list-disc space-y-1">
              <li>避難所運営シミュレーションの実行と進捗共有</li>
              <li>セッション参加者間でのリアルタイム情報共有</li>
              <li>訓練終了後の振り返り(完了ステップ・困った箇所のサマリー)</li>
            </ul>

            <h3 className="mt-4 font-bold">3.4 保管・委託先</h3>
            <p>
              データは Supabase Inc.(米国)のクラウドデータベースに保管されます。
              アプリのホスティングは Vercel Inc.(米国)を利用しています。
              いずれも一般的なセキュリティ対策が施された商用サービスですが、
              本アプリの仕様上、参加コードを知る第三者がデータを閲覧できる可能性が
              あります(訓練用途として割り切っています)。
            </p>

            <h3 className="mt-4 font-bold">3.5 保存期間・削除</h3>
            <p>
              現状は自動削除の仕組みはありません。データ削除をご希望の方は、
              下記の問い合わせ先までセッション情報をお伝えください。可能な限り
              速やかに削除いたします。
            </p>
          </div>
        </section>

        <section className="mb-10">
          <h2 className="text-lg font-bold text-slate-900">
            4. 免責事項
          </h2>
          <div className="mt-3 space-y-3 text-sm leading-relaxed text-slate-700">
            <p>
              本アプリの内容は内閣府「避難所運営等避難生活支援のためのガイドライン
              (令和6年12月改定)」および各自治体の運営マニュアルを参考に作成
              していますが、特定の災害・特定の避難所に最適化されたものではありません。
            </p>
            <p>
              <strong>
                本アプリは医療判断・法的判断を行うものではありません。
              </strong>
              傷病者の応急処置や医療的判断は医療従事者(医師・看護師・救急隊員等)に、
              法的判断は弁護士・行政担当者にご相談ください。
            </p>
            <p>
              本アプリの利用または利用できなかったことによって生じた損害について、
              提供者は一切の責任を負いません。実際の災害対応においては、
              地域の防災計画・自治体の指示・現場の専門家判断を最優先してください。
            </p>
          </div>
        </section>

        <section className="mb-10">
          <h2 className="text-lg font-bold text-slate-900">
            5. 著作権・出典
          </h2>
          <div className="mt-3 space-y-3 text-sm leading-relaxed text-slate-700">
            <p>主な参考資料:</p>
            <ul className="ml-5 list-disc space-y-1 text-xs">
              <li>
                内閣府(防災担当)「避難所運営等避難生活支援のためのガイドライン
                (チェックリスト)」平成28年4月(令和6年12月改定)
              </li>
              <li>
                香川県「避難所運営のタイムライン作成に向けたガイドライン」
                令和7年8月
              </li>
              <li>大阪市「避難所開設・運営ガイドライン」令和7年3月改訂</li>
              <li>調布市「避難所運営マニュアル作成のためのガイドライン」平成24年3月</li>
              <li>山口県「自主的な避難所運営ガイドライン」(本編・資料編)平成30年3月</li>
            </ul>
          </div>
        </section>

        <section className="mb-10">
          <h2 className="text-lg font-bold text-slate-900">
            6. お問い合わせ
          </h2>
          <div className="mt-3 space-y-3 text-sm leading-relaxed text-slate-700">
            <p>
              本アプリに関するご質問・ご要望・データ削除依頼・不具合報告等は、
              下記の GitHub Issues よりご連絡ください。
            </p>
            <p>
              <a
                href="https://github.com/tutibotaru/hinanjo-app/issues"
                target="_blank"
                rel="noopener noreferrer"
                className="text-emerald-700 underline"
              >
                https://github.com/tutibotaru/hinanjo-app/issues
              </a>
            </p>
          </div>
        </section>

        <section className="mb-10">
          <h2 className="text-lg font-bold text-slate-900">
            7. 提供主体
          </h2>
          <div className="mt-3 space-y-3 text-sm leading-relaxed text-slate-700">
            <p>
              本アプリは個人開発の試験版(ベータ版)として、避難所運営の訓練を
              支援する目的で提供されています。法人または公的機関による公式
              サービスではありません。
            </p>
            <p>
              GitHub リポジトリ:{" "}
              <a
                href="https://github.com/tutibotaru/hinanjo-app"
                target="_blank"
                rel="noopener noreferrer"
                className="text-emerald-700 underline"
              >
                tutibotaru/hinanjo-app
              </a>
            </p>
          </div>
        </section>

        <footer className="mt-12 border-t border-slate-200 pt-6">
          <Link
            href="/"
            className="text-sm text-emerald-700 underline"
          >
            ← トップに戻る
          </Link>
        </footer>
      </div>
    </main>
  );
}
