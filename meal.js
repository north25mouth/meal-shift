class DinnerPlannerApp {
    constructor() {
        // アプリの状態を初期化
        this.members = [];
        this.dinnerData = {};
        this.currentWeekStart = null;
        this.syncKey = null;
        
        // Firebase関連のプロパティ
        this.firebaseApp = null;
        this.database = null;
        this.syncRef = null;

        // 初期化メソッドを呼び出し
        this.initializeApp();
    }

    // アプリケーション全体の初期化
    initializeApp() {
        // DOMContentLoadedイベントを待つ
        document.addEventListener('DOMContentLoaded', () => {
            this.loadLocalData();
            this.setCurrentWeek();
            this.initializeEventListeners();
            this.initializeTabs();
            
            // Firebaseの初期化は1回のみ
            this.ensureFirebaseInitialized();
            
            this.updateUI();
        });
    }

    // Firebaseの初期化を1回のみ確実に行う
    ensureFirebaseInitialized() {
        // すでに初期化されている場合は何もしない
        if (this.firebaseApp) return;

        try {
            // Firebase設定
            const firebaseConfig = {
                apiKey: "AIzaSyAZVrNpZZ0tcKdCk6ICTyysK2v2T9_gOY4",
                authDomain: "mealshift-32f84.firebaseapp.com",
                databaseURL: "https://mealshift-32f84-default-rtdb.firebaseio.com",
                projectId: "mealshift-32f84",
                storageBucket: "mealshift-32f84.firebasestorage.app",
                messagingSenderId: "378628974920",
                appId: "1:378628974920:web:f2872d86eaff8d1a2c2b7d"
            };

            // すでに初期化されたアプリがある場合は、それを使用
            try {
                this.firebaseApp = firebase.app();
            } catch (error) {
                // まだ初期化されていない場合は新規作成
                this.firebaseApp = firebase.initializeApp(firebaseConfig);
            }

            // データベースを取得
            this.database = firebase.database();

            console.log('Firebase初期化成功');

            // 同期キーがある場合は同期開始
            if (this.syncKey) {
                this.startSync();
            }
        } catch (error) {
            console.error('Firebase初期化エラー:', error);
            this.updateSyncStatus('初期化エラー', false);
        }
    }

    // 同期キー設定
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

        // Firebaseが初期化されていない場合は初期化
        this.ensureFirebaseInitialized();

        // 新しい同期を開始
        this.startSync();

        // 入力をクリア
        keyInput.value = '';
    }

    // データ同期開始
    startSync() {
        // Firebaseが初期化されていることを確認
        if (!this.syncKey || !this.database) {
            console.warn('同期の前提条件が満たされていません');
            this.ensureFirebaseInitialized();
            return;
        }

        // 安全なキーに変換
        const safeKey = this.sanitizeSyncKey(this.syncKey);
        
        try {
            // Firebase参照作成
            this.syncRef = this.database.ref('dinnerData/' + safeKey);

            // データ変更リスナー
            this.syncRef.on('value', (snapshot) => {
                const data = snapshot.val();
                
                if (data) {
                    // データ更新
                    if (data.members) this.members = data.members;
                    if (data.dinnerData) this.dinnerData = data.dinnerData;

                    // ローカルデータ保存とUI更新
                    this.saveLocalData();
                    this.updateUI();
                    this.updateSyncStatus('同期完了', true);
                } else {
                    console.log('同期データが空です');
                }
            }, (error) => {
                console.error('同期エラー:', error);
                this.updateSyncStatus('同期エラー', false);
            });

            // 初回データアップロード
            this.uploadData();
        } catch (error) {
            console.error('同期プロセスエラー:', error);
            this.updateSyncStatus('同期エラー', false);
        }
    }
// アプリケーションのインスタンスを作成
const dinnerPlannerApp = new DinnerPlannerApp();

    // データアップロード
    uploadData() {
        if (!this.syncRef) return;

        const dataToSync = {
            members: this.members,
            dinnerData: this.dinnerData,
            lastUpdate: new Date().toISOString()
        };

        this.syncRef.set(dataToSync)
            .then(() => {
                console.log('データ同期成功');
                this.updateSyncStatus('同期完了', true);
            })
            .catch((error) => {
                console.error('データアップロードエラー:', error);
                this.updateSyncStatus('アップロードエラー', false);
            });
    }

    // 同期ステータス更新
    updateSyncStatus(message, isSuccess) {
        const statusElement = document.getElementById('sync-status');
        if (statusElement) {
            statusElement.textContent = `同期状態: ${message} (${new Date().toLocaleTimeString()})`;
            statusElement.style.backgroundColor = isSuccess ? '#edf7ee' : '#ffebee';
            statusElement.style.color = isSuccess ? '#2d6a4f' : '#d32f2f';
        }
    }

    // 同期キーをサニタイズ
    sanitizeSyncKey(key) {
        return key.replace(/[^a-zA-Z0-9_-]/g, '_')
                  .toLowerCase()
                  .substring(0, 20);
    }

    // 現在の週を設定
    setCurrentWeek(date = new Date()) {
        const day = date.getDay();
        const diff = date.getDate() - day;
        this.currentWeekStart = new Date(date.setDate(diff));
        this.currentWeekStart.setHours(0, 0, 0, 0);
    }

    // 週移動
    moveWeek(direction) {
        const date = new Date(this.currentWeekStart);
        date.setDate(date.getDate() + (7 * direction));
        this.setCurrentWeek(date);
        this.updateDinnerTable();
    }

    // UI全体を更新
    updateUI() {
        this.updateMembersList();
        this.updateDinnerTable();
        this.updateSyncKeyInfo();
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

    // メンバー追加
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
        this.updateUI();

        // データを同期
        if (this.syncRef) {
            this.uploadData();
        }

        // 入力をクリア
        input.value = '';
    }

    // メンバー削除
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
        this.updateUI();

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
        // ステータスの種類
        const statuses = ['maru', 'batsu', 'hatena'];

        // 現在のステータスを取得
        const currentStatus = this.dinnerData[statusKey];

        // 次のステータスを決定
        const currentIndex = currentStatus ? statuses.indexOf(currentStatus) : -1;
        const nextStatusIndex = (currentIndex + 1) % statuses.length;
        const nextStatus = statuses[nextStatusIndex];

        // 現在のステータスクラスを削除
        cell.classList.remove('status-maru', 'status-batsu', 'status-hatena');

        // アニメーションのためにクラスをリセット
        cell.classList.remove('animate');

        // 次のステータスがある場合はクラスを追加
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
