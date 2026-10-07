"""Regression checks against a LOCAL QA instance; creates accounting fixtures.

Requires backend requirements (Playwright), a running frontend/backend, and
IBFS_QA_USERNAME / IBFS_QA_PASSWORD. Never run against real accounting data.
"""
import os
import re
import uuid
from urllib.parse import urlparse
from playwright.sync_api import sync_playwright, expect, Error

BASE = os.environ.get('IBFS_QA_URL', 'http://127.0.0.1:4100').rstrip('/')
assert urlparse(BASE).hostname in ('localhost', '127.0.0.1'), 'Use a local, disposable QA instance'
USERNAME, PASSWORD = os.environ['IBFS_QA_USERNAME'], os.environ['IBFS_QA_PASSWORD']

with sync_playwright() as p:
    browser = p.chromium.launch(headless=True)
    context = browser.new_context(viewport={'width': 1440, 'height': 1000}, service_workers='allow')
    page = context.new_page()
    errors = []
    page.on('pageerror', lambda error: errors.append(str(error)))
    # Obtain a real Django CSRF cookie, then hold session status indefinitely.
    assert context.request.get(f'{BASE}/api/session/status/').ok
    held = []
    context.route('**/api/session/status/', lambda route: held.append(route))
    page.goto(f'{BASE}/login')
    expect(page.get_by_label('Username')).to_be_visible(timeout=3000)
    page.wait_for_timeout(50)
    assert held, 'The session request must still be pending'
    page.get_by_label('Username').fill(USERNAME)
    page.get_by_label('Password', exact=True).fill(PASSWORD)
    page.get_by_role('button', name='Sign In', exact=True).click()
    expect(page.get_by_role('button', name=re.compile('^Quick action$', re.I))).to_be_visible(timeout=5000)
    context.unroute_all(behavior='ignoreErrors')
    for route in held:
        try: route.abort()
        except Error:
            # Aborted fetches can no longer be sent; finish the routing chain.
            route.fallback()
    print('PASS: usable login and immediate submission while status hangs')

    def headers():
        return {'X-CSRFToken': context.request.get(f'{BASE}/api/session/status/').json()['csrf_token']}

    def create(resource, data):
        response = context.request.post(f'{BASE}/api/{resource}/', headers=headers(), data=data)
        assert response.status == 201, response.text()
        return response.json()

    name = f'Regression bank {uuid.uuid4().hex[:8]}'
    account = create('accounts', {'name': name, 'type': 'bank', 'opening_balance': '1000'})
    contact = create('contacts', {'contact_name': name + ' source', 'phone': '123', 'opening_balance': '-100'})
    # Confirm the advertised Quick Action opens a working receipt form.
    page.get_by_role('button', name=re.compile('^Quick action$', re.I)).click()
    dialog = page.get_by_role('dialog')
    expect(dialog.get_by_role('button', name='Income', exact=True)).to_have_count(1)
    dialog.get_by_role('button', name='Income', exact=True).click()
    page.get_by_label('Entry description').fill('QA receipt')
    page.get_by_label('Entry amount').fill('200')
    page.get_by_role('button', name='Select account').click()
    page.get_by_role('button', name=name, exact=False).click()
    page.get_by_role('button', name='Create Income', exact=True).click()
    page.wait_for_url('**/documents/*', timeout=10000)
    expect(page.get_by_text('Income received', exact=True)).to_be_visible()
    first_doc_id = int(page.url.split('/')[-1])
    print('PASS: Income action, optional-contact receipt form and posting')

    # Background status validation must not prevent opening the saved workspace.
    held = []
    context.route('**/api/session/status/', lambda route: held.append(route))
    page.goto(f"{BASE}/accounts/{account['id']}")
    expect(page.get_by_role('button', name='Self transfer', exact=True)).to_be_visible(timeout=3000)
    assert held, 'The workspace must render while validation is pending'
    page.get_by_role('link', name='Offline files & drafts', exact=True).click()
    expect(page.get_by_role('heading', name='Offline files & drafts', exact=True)).to_be_visible(timeout=3000)
    context.unroute_all(behavior='ignoreErrors')
    for route in held:
        try: route.abort()
        except Error: route.fallback()
    page.get_by_label('Offline password', exact=True).fill('QAVault123!')
    page.get_by_label('Confirm password', exact=True).fill('QAVault123!')
    page.get_by_role('button', name='Enable offline access', exact=True).click()
    page.get_by_role('button', name='New local draft', exact=True).click()
    expect(page.get_by_text('Unposted draft', exact=False).first).to_be_visible()
    print('PASS: saved workspace and local drafts remain accessible while status hangs')

    page.goto(f'{BASE}/documents')
    page.get_by_role('button').filter(has=page.locator('svg.lucide-sliders-horizontal')).first.click()
    dialog = page.get_by_role('dialog')
    expect(dialog.get_by_role('button', name='Income', exact=True)).to_have_count(1)
    expect(dialog.get_by_role('button', name='Expenses', exact=True)).to_have_count(1)
    page.keyboard.press('Escape')
    print('PASS: document filters have no duplicate Income or Expense choices')

    page.goto(f"{BASE}/accounts/{account['id']}")
    expect(page.get_by_text(name, exact=True).first).to_be_visible()
    page.get_by_role('button').filter(has=page.locator('svg.lucide-ellipsis-vertical')).first.click()
    page.get_by_role('menuitem', name='Edit Account', exact=True).click()
    expect(page.get_by_label('Opening balance', exact=True)).to_have_value('1000.00')
    page.get_by_label('Opening balance', exact=True).fill('2000')
    # Expire React Query's freshness and trigger an actual window-focus refetch.
    page.clock.install()
    page.clock.fast_forward(31000)
    with page.expect_response(lambda response: response.url.endswith(f"/api/accounts/{account['id']}/") and response.request.method == 'GET'):
        page.evaluate("window.dispatchEvent(new Event('visibilitychange'))")
    expect(page.get_by_label('Opening balance', exact=True)).to_have_value('2000')
    page.clock.resume()
    page.get_by_role('dialog').get_by_role('button', name='Save Changes', exact=True).click()
    expect(page.get_by_role('dialog')).not_to_be_visible()
    page.get_by_role('button', name='Ledger', exact=True).click()
    ledger = page.get_by_test_id('account-ledger')
    expect(ledger).to_contain_text('₹2,000.00 Dr')
    expect(ledger).to_contain_text('₹2,200.00 Dr')
    print('PASS: refetch preserves edits, saving recalculates the opening and running balances')

    def delete_from_list(url, doc_id):
        page.goto(url)
        doc = context.request.get(f'{BASE}/api/documents/{doc_id}/').json()
        card = page.locator('[data-slot="card"]').filter(has=page.get_by_text(doc['doc_id'], exact=True)).first
        expect(card).to_be_visible()
        card.get_by_role('button').filter(has=page.locator('svg.lucide-ellipsis-vertical')).click()
        page.get_by_role('menuitem', name='Delete', exact=False).click()
        page.get_by_role('button', name='Revert & Delete', exact=False).click()
        expect(page.get_by_role('dialog')).not_to_be_visible()
        expect(page).to_have_url(url)
        expect(page.get_by_text(doc['doc_id'], exact=True)).to_have_count(0)
        archived = context.request.get(f'{BASE}/api/documents/{doc_id}/').json()
        assert archived['is_active'] is False and archived['transactions'] == []

    # Give router.back a different previous route, then verify deletion stays put.
    page.goto(f'{BASE}/reports')
    delete_from_list(f"{BASE}/accounts/{account['id']}", first_doc_id)
    second = create('documents', {'type': 'income', 'contact': contact['id'], 'payment_account': account['id'],
                                  'date': '2026-10-07', 'line_items': [{'name': 'Second receipt', 'amount': 300}]})
    page.goto(f'{BASE}/accounts')
    delete_from_list(f'{BASE}/transactions', second['id'])
    assert context.request.get(f"{BASE}/api/accounts/{account['id']}/").json()['current_balance'] == '2000.00'
    assert context.request.get(f"{BASE}/api/contacts/{contact['id']}/").json()['current_cf'] == '-100.00'
    print('PASS: deleting income from account and transaction lists stays put and reverses only cash')

    # Simulate logout failure with a valid server cookie still present.
    page.goto(f'{BASE}/settings')
    context.route('**/api/session/logout/', lambda route: route.abort('connectionfailed'))
    page.get_by_role('button', name='Logout', exact=False).click()
    expect(page.get_by_label('Username')).to_be_visible(timeout=3000)
    assert context.request.get(f'{BASE}/api/session/status/').json()['authenticated']
    page.reload()
    expect(page.get_by_label('Username')).to_be_visible(timeout=3000)
    page.goto(f'{BASE}/offline')
    expect(page.get_by_role('link', name='Sign in online to set up offline access')).to_be_visible(timeout=3000)
    expect(page.get_by_role('button', name='New local draft', exact=True)).to_have_count(0)
    page.goto(f'{BASE}/accounts')
    expect(page.get_by_label('Username')).to_be_visible(timeout=3000)
    other_tab = context.new_page()
    other_tab.goto(f'{BASE}/login')
    expect(other_tab.get_by_label('Username')).to_be_visible(timeout=3000)
    assert not errors, errors
    print('PASS: failed logout locks local access across reloads, private routes and new tabs')
    context.unroute_all(behavior='ignoreErrors')
    browser.close()
