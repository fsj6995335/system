-- 清空现有测试数据（按依赖顺序）
DELETE FROM operation_logs;
DELETE FROM notifications;
DELETE FROM match_records;
DELETE FROM disbursements;
DELETE FROM credit_reports;
DELETE FROM daily_stats;
DELETE FROM ai_video_tasks;
DELETE FROM bank_products;
DELETE FROM users;
DELETE FROM teams;
DELETE FROM branches;

-- ============ 分公司 ============
INSERT INTO branches (id, name, address, phone, status) VALUES
(1, '北京总部', '北京市朝阳区建国路88号', '010-88886666', 'active'),
(2, '上海分公司', '上海市浦东新区陆家嘴金融中心', '021-66668888', 'active'),
(3, '深圳分公司', '深圳市南山区科技园', '0755-33335555', 'active');

-- ============ 团队 ============
INSERT INTO teams (id, name, branchId) VALUES
(1, '信贷一组', 1),
(2, '信贷二组', 1),
(3, '上海业务组', 2),
(4, '深圳业务组', 3);

-- ============ 用户（6个角色） ============
INSERT INTO users (openId, name, email, role, branchId, teamId, position, phone, lastSignedIn) VALUES
('dev-owner',       '张总（老板）', 'boss@test.com',        'boss',        1,    NULL, '总经理',   '13800000001', NOW()),
('dev-director',    '李总监',       'director@test.com',    'director',    1,    NULL, '运营总监', '13800000002', NOW()),
('dev-shareholder', '王股东',       'shareholder@test.com', 'shareholder', NULL, NULL, '股东',     '13800000003', NOW()),
('dev-leader',      '赵组长',       'leader@test.com',      'leader',      1,    1,    '信贷组长', '13800000004', NOW()),
('dev-finance',     '钱财务',       'finance@test.com',     'finance',     1,    1,    '财务主管', '13800000005', NOW()),
('dev-employee',    '孙员工',       'employee@test.com',    'employee',    1,    1,    '信贷专员', '13800000006', NOW());

-- 更新分公司和团队的管理者
UPDATE branches SET managerId = (SELECT id FROM users WHERE openId = 'dev-director') WHERE id = 1;
UPDATE branches SET managerId = (SELECT id FROM users WHERE openId = 'dev-leader') WHERE id = 2;
UPDATE teams SET leaderId = (SELECT id FROM users WHERE openId = 'dev-leader') WHERE id = 1;

-- ============ 银行产品 ============
INSERT INTO bank_products (id, bankName, productName, productType, minAmount, maxAmount, interestRateMin, interestRateMax, termMin, termMax, requirements, minCreditScore, features, status) VALUES
(1, '中国工商银行', '工行经营贷', 'business',  100000.00, 5000000.00,  3.85, 4.50, 12, 60, '营业执照满2年，年流水200万以上', 650, '放款快，利率低', 'active'),
(2, '中国建设银行', '建行信用贷', 'personal',   50000.00, 1000000.00,  4.00, 5.20,  6, 36, '征信良好，月收入1万以上', 600, '纯信用，无需抵押', 'active'),
(3, '中国农业银行', '农行抵押贷', 'mortgage',  500000.00, 10000000.00, 3.65, 4.10, 12, 120, '房产抵押，评估价值500万以上', 620, '额度高，期限长', 'active'),
(4, '招商银行',     '招行消费贷', 'personal',   10000.00, 500000.00,   4.50, 6.00,  3, 24, '征信良好，有稳定工作', 580, '线上申请，快速审批', 'active');

-- ============ 征信报告 ============
INSERT INTO credit_reports (id, uploaderId, uploaderName, customerName, customerPhone, customerIdCard, creditScore, customerGrade, monthlyIncome, totalDebt, hasOverdue, status, branchId, teamId) VALUES
(1, (SELECT id FROM users WHERE openId = 'dev-employee'), '孙员工', '刘大明', '13900001111', '110101199001011234', 720, 'A', 35000.00, 120000.00, 0, 'pending',  1, 1),
(2, (SELECT id FROM users WHERE openId = 'dev-employee'), '孙员工', '陈小红', '13900002222', '310101199205052345', 680, 'B', 28000.00,  80000.00, 0, 'reviewed', 1, 1),
(3, (SELECT id FROM users WHERE openId = 'dev-leader'),   '赵组长', '周强',   '13900003333', '440101198812123456', 750, 'A', 50000.00, 200000.00, 0, 'pending',  1, 1);

-- ============ 放款记录 ============
INSERT INTO disbursements (id, creditReportId, bankProductId, customerName, bankName, amount, commission, employeeId, employeeName, branchId, teamId, status, disbursedAt, notes) VALUES
(1, 2, 1, '陈小红', '中国工商银行', 2000000.00, 40000.00, (SELECT id FROM users WHERE openId = 'dev-employee'), '孙员工', 1, 1, 'disbursed', DATE_SUB(NOW(), INTERVAL 10 DAY), '客户资质优良，顺利放款'),
(2, 3, 3, '周强',   '中国农业银行', 5000000.00, 100000.00, (SELECT id FROM users WHERE openId = 'dev-leader'), '赵组长', 1, 1, 'approved', NULL, '大额抵押贷，审批通过');

-- ============ 操作日志 ============
INSERT INTO operation_logs (userId, userName, action, module, detail, ip) VALUES
((SELECT id FROM users WHERE openId = 'dev-owner'),    '张总（老板）', 'login',  'system',        '管理员登录系统', '127.0.0.1'),
((SELECT id FROM users WHERE openId = 'dev-employee'), '孙员工',       'create', 'credit_report', '上传征信报告：刘大明', '127.0.0.1'),
((SELECT id FROM users WHERE openId = 'dev-employee'), '孙员工',       'create', 'credit_report', '上传征信报告：陈小红', '127.0.0.1'),
((SELECT id FROM users WHERE openId = 'dev-leader'),   '赵组长',       'create', 'disbursement',  '创建放款记录：200万经营贷', '127.0.0.1');

-- ============ 通知 ============
INSERT INTO notifications (userId, title, content, type, isRead) VALUES
((SELECT id FROM users WHERE openId = 'dev-owner'),    '新放款审批',     '有一笔500万抵押贷款等待审批', 'info', 0),
((SELECT id FROM users WHERE openId = 'dev-employee'), '征信报告已审核', '客户陈小红的征信报告已通过审核', 'success', 0),
((SELECT id FROM users WHERE openId = 'dev-leader'),   '团队业绩提醒',   '本月团队放款目标完成60%', 'warning', 0);

-- ============ 统计数据 ============
INSERT INTO daily_stats (date, branchId, teamId, newCreditReports, newCustomersA, newCustomersB, newCustomersC, newDisbursements, disbursementAmount, commissionAmount) VALUES
(DATE_FORMAT(CURDATE(), '%Y-%m-%d'), 1, 1, 2, 1, 1, 0, 1, 2000000.00, 40000.00),
(DATE_FORMAT(DATE_SUB(CURDATE(), INTERVAL 1 DAY), '%Y-%m-%d'), 1, 1, 1, 1, 0, 0, 1, 5000000.00, 100000.00),
(DATE_FORMAT(DATE_SUB(CURDATE(), INTERVAL 2 DAY), '%Y-%m-%d'), 1, 1, 0, 0, 0, 0, 0, 0, 0),
(DATE_FORMAT(CURDATE(), '%Y-%m-%d'), 2, 3, 0, 0, 0, 0, 0, 0, 0),
(DATE_FORMAT(DATE_SUB(CURDATE(), INTERVAL 1 DAY), '%Y-%m-%d'), 3, 4, 0, 0, 0, 0, 0, 0, 0);
