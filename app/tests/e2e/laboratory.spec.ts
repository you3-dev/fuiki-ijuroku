import { expect, test } from '@playwright/test'

test('loads the laboratory and persists the player name', async ({ page }) => {
  await page.goto('/')
  await expect(page.getByRole('heading', { name: '辺境研究所' })).toBeVisible()

  await page.getByRole('link', { name: '設定・保存' }).click()
  const nameInput = page.getByLabel('記録に表示する名前')
  await nameInput.fill('試験調査員')
  await page.getByRole('button', { name: '名前を保存' }).click()
  await expect(page.getByText('調査員名を保存しました。')).toBeVisible()

  await page.reload()
  await page.getByRole('link', { name: '研究所へ戻る' }).click()
  await expect(page.getByText('調査員 試験調査員')).toBeVisible()
})
