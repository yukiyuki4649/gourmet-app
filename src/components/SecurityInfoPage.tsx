export function SecurityInfoPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 py-6 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">🔒 このサイトのセキュリティについて</h1>
            <p className="text-gray-600 mt-2">ログインの目的と、登録される情報の見え方についての説明です。</p>
          </div>
          <a href="#/" className="px-4 py-2 bg-gray-200 rounded-md hover:bg-gray-300 whitespace-nowrap">
            一覧に戻る
          </a>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-8 space-y-6">
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-bold mb-2">ログイン機能の目的</h2>
          <p className="text-sm text-gray-700 leading-relaxed">
            このサイトにログイン機能があるのは、無関係な人による荒らしや不正な変更(店舗情報の書き換え・削除など)を防ぐためです。
            取得した情報を、それ以外の目的(広告・第三者への提供など)に使用することは一切ありません。
          </p>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-bold mb-2">登録時に保存される情報</h2>
          <p className="text-sm text-gray-700 leading-relaxed">
            Googleアカウントでログインすると、次の2つだけが保存されます。
          </p>
          <ul className="list-disc list-inside text-sm text-gray-700 mt-2 space-y-1">
            <li>メールアドレス(ログインしたGoogleアカウントのアドレス)</li>
            <li>表示名(店舗の「追加者」として表示される名前)</li>
          </ul>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-bold mb-2">誰が何を見られるか</h2>
          <ul className="list-disc list-inside text-sm text-gray-700 space-y-2">
            <li>
              <span className="font-semibold">管理者(サイト運営者)</span>
              は、あなたのメールアドレス・表示名・当サイト内での権限の三つの情報を確認できます。
            </li>
            <li>
              <span className="font-semibold">承認された他の利用者</span>
              には、表示名のみが見えます(店舗の「追加者」表示など)。メールアドレスは見えません。
            </li>
            <li>
              <span className="font-semibold">ログインしていない訪問者</span>
              には、あなたの情報は一切表示されません。
            </li>
          </ul>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-bold mb-2">その他の安全対策</h2>
          <ul className="list-disc list-inside text-sm text-gray-700 space-y-2">
            <li>店舗の「リンク」欄には、悪意のある特殊なリンクを登録されても実行されないよう対策しています。</li>
            <li>
              店舗の削除は「非表示」として扱われ、実際のデータは消えません。管理者だけが非表示の店舗を見て、必要であれば元に戻せます。
            </li>
            <li>新しく登録したアカウントは自動的に「承認待ち」となり、管理者が承認するまで店舗の追加・編集はできません。</li>
          </ul>
        </div>
      </main>
    </div>
  );
}
