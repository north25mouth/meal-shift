// アプリケーションの状態と機能を管理するクラス
class DinnerPlannerApp {
    constructor() {
        // アプリの状態を初期化
        this.members = [];
        this.dinnerData = {};
        this.currentWeekStart = null;
        this.syncKey = null;
        this.database = null;
        this.syncRef = null;

        // イベントリスナーの初期化
        this.initializeEventListeners();
    }

    // アプリケーションの初期化メソッド
    init() {
        // ローカルストレージからデータを読み込む
        this.loadLocalData();

        // 現在の週の開始日を設定
        this.setCurrentWeek();

        // Firebaseを初期化
        this.initFirebase();

        // UIを更新
        this.updateMembersList();
        this.updateDinnerTable();
        this.updateSyncKeyInfo();
    }

    // イベントリスナーを設定
    initializeEventListeners() {
        // タブ切り替えイベント
        document.addEventListener('DOMContentLoaded', () => {
            const tabButtons = document.querySelectorAll('.tab-button');
            const tabContents = document.querySelectorAll('.tab-content');

            tabButtons.forEach(button => {
                button.addEventListener('click', () => {
                    // すべてのタブとコンテンツからアクティブクラスを削除
                    tabButtons.forEach(btn => btn.classList.remove('active'));
                    tabContents.forEach(content => content.classList.remove('active'));

                    // クリックされたタブとコンテンツにアクティブクラスを追加
                    button.classList.add('active');
                    const tabId = button.dataset.tab;
                    document.getElementById(tabId).classList.add('active');
                });
            });

            // メンバー追加ボタンのイベント
            document.getElementById('add-member-btn').addEventListener('click', () => this.addMember());
            document.getElementById('new-member').addEventListener('keypress', (e) => {
                if (e.key === 'Enter') this.addMember();
            });

            // 週移動ボタンのイベント
            document.getElementById('prev-week').addEventListener('click', () => this.moveWeek(-1));
            document.getElementById('next-week').addEventListener('click', () => this.moveWeek(1));

            // 同期キー設定イベント
            document.getElementById('set-sync-key').addEventListener('click', () => this.setSyncKey());
            document.getElementById('sync-key').addEventListener('keypress', (e) => {
                if (e.key === 'Enter') this.setSyncKey();
            });

            // アプリケーションを初期化
            this.init();
        });
    }

    // ローカルストレージからデータを読み込む
    loadLocalData() {
        const savedMembers = localStorage.getItem('tapDinnerMembers');
        const savedDinnerData = localStorage.getItem('tapDinnerData');
        const savedSyncKey = localStorage.getItem('tapDinnerSyncKey');

        if (savedMembers) this.members = JSON.parse(savedMembers);
        if (savedDinnerData) this.dinnerData = JSON.parse(savedDinnerData);
        if (savedSyncKey) this.syncKey = savedSyncKey;
    }

    // ローカルデータを保存
    saveLocalData() {
        localStorage.setItem('tapDinnerMembers', JSON.stringify(this.members));
        localStorage.setItem('tapDinnerData', JSON.stringify(this.dinnerData));
        if (this.syncKey) {
            localStorage.setItem('tapDinnerSyncKey', this.syncKey);
        }
    }

    // Firebaseを初期化
    initFirebase() {
        // Firebaseの設定
        const firebaseConfig = {
            apiKey: "AIzaSyAZVrNpZZ0tcKdCk6ICTyysK2v2T9_gOY4",
            authDomain: "mealshift-32f84.firebaseapp.com",
            databaseURL: "https://mealshift-32f84-default-rtdb.firebaseio.com",
            projectId: "mealshift-32f84",
            storageBucket: "mealshift-32f84.firebasestorage.app",
            messagingSenderId: "378628974920",
            appId: "1:378628974920:web:f2872d86eaff8d1a2c2b7d"
        };

        // Firebase初期化
        this.firebase = firebase.initializeApp(firebaseConfig);
        this.database = this.firebase.database();

        // 同期キーが設定されている場合、データ同期を開始
        if (this.syncKey) {
            this.startSync();
        }
    }

    // データ同期を開始
    startSync() {
        if (!this.syncKey) return;

        // 安全なリファレンスキーに変換
        const safeKey = this.syncKey.replace(/[.#$/[\]]/g, '_');

        // Firebaseのリファレンスを設定
        this.syncRef = this.database.ref('dinnerData/' + safeKey);

        // データ変更時のリスナーを設定
        this.syncRef.on('value', (snapshot) => {
            const data = snapshot.val();
            if (data) {
                // Firebaseからのデータで上書き
                if (data.members) this.members = data.members;
                if (data.dinnerData) this.dinnerData = data.dinnerData;

                // ローカルデータを更新
                this.saveLocalData();

                // UIを更新
                this.updateMembersList();
                this.updateDinnerTable();

                // 同期ステータスを更新
                document.getElementById('sync-status').textContent = 
                    `同期状態: 同期完了 (${new Date().toLocaleTimeString()})`;
            }
        });

        // 初回データをアップロード
        this.uploadData();
    }

    // Firebaseにデータをアップロード
    uploadData() {
        if (!this.syncRef) return;

        this.syncRef.set({
            members: this.members,
            dinnerData: this.dinnerData,
            lastUpdate: new Date().toISOString()
        });
    }

    // 同期キーを設定
    setSyncKey() {
        const keyInput = document.getElementById('sync-key');
        const key = keyInput.value.trim();

        if (!key) {
            alert('合言葉を入力してください');
            return;
        }

        // 以前の同期を停止
        if (this.syncRef) {
            this.syncRef.off();
        }

        this.syncKey = key;
        this.saveLocalData();
        this.updateSyncKeyInfo();

        // 新しい同期を開始
        this.startSync();

        // 入力をクリア
        keyInput.value = '';
    }

    // 現在の週の開始日を設定
    setCurrentWeek(date = new Date()) {
        const day = date.getDay(); // 0=日曜日
        const diff = date.getDate() - day;
        this.currentWeekStart = new Date(date.setDate(diff));
        this.currentWeekStart.setHours(0, 0, 0, 0);
    }

    // 週を移動
    moveWeek(direction) {
        const date = new Date(this.currentWeekStart);
        date.setDate(date.getDate() + (7 * direction));
        this.setCurrentWeek(date);
        this.updateDinnerTable();
    }

    // メンバーリストを更新
    updateMembersList() {
        const membersList = document.getElementById('members-list');
        membersList.innerHTML = '';

        if (this.members.length === 0) {
            membersList.innerHTML = '<div class="empty-message">メンバーがいません。家族のメンバーを追加してください。</div>';
            return;
        }

        this.members.forEach(member => {
            const memberRow = document.createElement('div');
            memberRow.className = 'member-row';

            const nameSpan = document.createElement('span');
            nameSpan.className = 'member-name';
            nameSpan.textContent = member.name;

            const deleteBtn = document.createElement('button');
            deleteBtn.textContent = '削除';
            deleteBtn.className = 'delete-btn';
            deleteBtn.addEventListener('click', () => this.deleteMember(member.id));

            memberRow.appendChild(nameSpan);
            memberRow.appendChild(deleteBtn);
            membersList.appendChild(memberRow);
        });
    }

    // メンバーを追加
    addMember() {
        const input = document.getElementById('new-member');
        const name = input.value.trim();

        if (!name) {
            alert('名前を入力してください');
            return;
        }

        // 重複チェック
        const exists = this.members.some(member => member.name === name);
        if (exists) {
            alert('その名前のメンバーは既に登録されています');
            return;
        }

        // 新しいメンバーを追加
        const newMember = {
            id: Date.now().toString(),
            name
        };

        this.members.push(newMember);
        this.saveLocalData();
        this.updateMembersList();
        this.updateDinnerTable();

        // データを同期
        if (this.syncRef) {
            this.uploadData();
        }

        // 入力をクリア
        input.value = '';
    }

    // メンバーを削除
    deleteMember(memberId) {
        const confirmed = confirm('このメンバーを削除しますか？関連するすべての予定も削除されます。');
        if (!confirmed) return;

        // メンバーを削除
        this.members = this.members.filter(member => member.id !== memberId);

        // メンバーに関連する夕飯データも削除
        const newDinnerData = {};
        for (const key in this.dinnerData) {
            if (!key.startsWith(memberId + '_')) {
                newDinnerData[key] = this.dinnerData[key];
            }
        }

        this.dinnerData = newDinnerData;
        this.saveLocalData();
        this.updateMembersList();
        this.updateDinnerTable();

        // データを同期
        if (this.syncRef) {
            this.uploadData();
        }
    }

    // 予定表を更新
    updateDinnerTable() {
        const container = document.getElementById('dinner-table-container');
        container.innerHTML = '';

        if (this.members.length === 0) {
            container.innerHTML = '<div class="empty-message">メンバーがいません。「家族メンバー」タブからメンバーを追加してください。</div>';
            return;
        }

        // テーブルを作成
        const table = document.createElement('table');
        const headerRow = document.createElement('tr');

        // 名前ヘッダー
        const nameHeader = document.createElement('th');
        nameHeader.textContent = '名前';
        headerRow.appendChild(nameHeader);

        // 日付のヘッダーを作成
        const weekdays = ['日', '月', '火', '水', '木', '金', '土'];
        for (let i = 0; i < 7; i++) {
            const date = new Date(this.currentWeekStart);
            date.setDate(date.getDate() + i);

            const dayHeader = document.createElement('th');
            dayHeader.textContent = `${date.getMonth() + 1}/${date.getDate()}(${weekdays[i]})`;

            // 週末と今日の日付にスタイルを適用
            if (i === 0 || i === 6) dayHeader.classList.add('weekend');
            if (date.toDateString() === new Date().toDateString()) dayHeader.classList.add('today');

            headerRow.appendChild(dayHeader);
        }
        table.appendChild(headerRow);

        // メンバーごとに行を作成
        this.members.forEach(member => {
            const row = document.createElement('tr');

            // 名前セル
            const nameCell = document.createElement('td');
            nameCell.textContent = member.name;
            nameCell.style.fontWeight = 'bold';
            row.appendChild(nameCell);

            // 各日付のセルを作成
            for (let i = 0; i < 7; i++) {
                const date = new Date(this.currentWeekStart);
                date.setDate(date.getDate() + i);
                const dateStr = this.formatDate(date);

                const cell = document.createElement('td');
                cell.className = 'status-cell';

                // 週末と今日の日付にスタイルを適用
                if (i === 0 || i === 6) cell.classList.add('weekend');
                if (date.toDateString() === new Date().toDateString()) cell.classList.add('today');

                const statusIcon = document.createElement('div');
                statusIcon.className = 'status-icon';
                cell.appendChild(statusIcon);

                // データキー
                const statusKey = `${member.id}_${dateStr}`;

                // 既存のステータスがあれば適用
                if (this.dinnerData[statusKey]) {
                    const status = this.dinnerData[statusKey];
                    cell.classList.add(`status-${status}`);
                }

                // クリックイベントを追加
                cell.addEventListener('click', () => this.toggleStatus(cell, statusKey));

                row.appendChild(cell);
            }

            table.appendChild(row);
        });

        container.appendChild(table);
    }

    // ステータスを切り替え
    toggleStatus(cell, statusKey) {
        // 現在のステータスクラスを削除
        cell.classList.remove('status-maru', 'status-batsu', 'status-hatena');

        // アニメーションのためにクラスをリセット
        cell.classList.remove('animate');

        // 現在のステータスを取得
        const currentStatus = this.dinnerData[statusKey];
        let nextStatus = null;

        // ステータスの循環
        if (currentStatus === undefined) {
            nextStatus = 'maru';
        } else if (currentStatus === 'maru') {
            nextStatus = 'batsu';
        } else if (currentStatus === 'batsu') {
            nextStatus = 'hatena';
        }

        // 次のステータスを設定
        if (nextStatus) {
            cell.classList.add(`status-${nextStatus}`);
            this.dinnerData[statusKey] = nextStatus;
        } else {
            // ステータスがない場合はデータから削除
            delete this.dinnerData[statusKey];
        }

        // アニメーションを追加
        setTimeout(() => {
            cell.classList.add('animate');
        }, 10);

        // データを保存
        this.saveLocalData();

        // データを同期
        if (this.syncRef) {
            this.uploadData();
        }
    }

    // 同期キー情報を更新
    updateSyncKeyInfo() {
        const display = document.getElementById('sync-key-display');
        const status = document.getElementById('sync-status');

        if (this.syncKey) {
            display.textContent = this.syncKey;
            status.textContent = '同期状態: 設定完了';
        } else {
            display.textContent = '未設定';
            status.textContent = '同期状態: 未設定';
        }
    }

    // 日付をフォーマット (YYYY-MM-DD)
    formatDate(date) {
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    }
}

// アプリケーションのインスタンスを作成
const dinnerPlannerApp = new DinnerPlannerApp();
